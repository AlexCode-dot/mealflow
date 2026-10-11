package com.mealflow.appapi.integrations.v1;

import com.mealflow.appapi.security.integrations.TokenHasher;
import com.mealflow.appapi.security.oauth.IntegrationTokenClaims;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

/**
 * {@code Idempotency-Key} handling for integration API writes.
 *
 * <p>Insert-first: a record keyed by (userId, clientId, key) is inserted <em>before</em> the write
 * runs; the unique index guarantees only one request per key ever executes. Outcomes:
 *
 * <ul>
 *   <li>new key → run the write; on a 2xx store status/body/ETag/Location; on any error delete the
 *       record so the client may retry with the same key;
 *   <li>same key, same request (method + path + If-Match + body hash), completed → replay the
 *       stored response with {@code Idempotency-Replayed: true};
 *   <li>same key, different request → 422;
 *   <li>same key, original still in flight → 409.
 * </ul>
 *
 * Records expire after 24 h (TTL index on {@code createdAt}).
 */
@Service
public class IdempotencyService {

    public static final String HEADER = "Idempotency-Key";
    public static final String REPLAYED_HEADER = "Idempotency-Replayed";
    static final String COLLECTION = "integration_idempotency";
    static final Duration TTL = Duration.ofHours(24);
    private static final int MAX_KEY_LENGTH = 255;

    private final MongoTemplate mongo;
    private final ObjectMapper objectMapper;
    private final TokenHasher hasher;
    private final Clock clock;

    public IdempotencyService(MongoTemplate mongo, ObjectMapper objectMapper, TokenHasher hasher, Clock clock) {
        this.mongo = mongo;
        this.objectMapper = objectMapper;
        this.hasher = hasher;
        this.clock = clock;
    }

    @PostConstruct
    void ensureIndexes() {
        var collection = mongo.getCollection(COLLECTION);
        collection.createIndex(
                Indexes.ascending("userId", "clientId", "key"),
                new IndexOptions().name("idempotency_user_client_key").unique(true));
        collection.createIndex(
                Indexes.ascending("createdAt"),
                new IndexOptions().name("idempotency_ttl").expireAfter(TTL.toSeconds(), TimeUnit.SECONDS));
    }

    public ResponseEntity<Object> execute(
            IntegrationTokenClaims token,
            String key,
            HttpServletRequest request,
            Object body,
            Supplier<ResponseEntity<?>> action) {
        if (key == null || key.isBlank()) {
            throw IntegrationApiException.badRequest("Idempotency-Key header is required for write requests");
        }
        String trimmedKey = key.trim();
        if (trimmedKey.length() > MAX_KEY_LENGTH || !trimmedKey.chars().allMatch(c -> c >= 0x21 && c <= 0x7e)) {
            throw IntegrationApiException.badRequest("Idempotency-Key must be 1-255 visible ASCII characters");
        }
        String requestHash = requestHash(request, body);

        for (int attempt = 0; attempt < 2; attempt++) {
            Instant now = clock.instant();
            ObjectId recordId = new ObjectId();
            Document record = new Document("_id", recordId)
                    .append("userId", token.userId())
                    .append("clientId", token.clientId())
                    .append("key", trimmedKey)
                    .append("requestHash", requestHash)
                    .append("state", "in_progress")
                    .append("createdAt", Date.from(now));
            try {
                mongo.insert(record, COLLECTION);
            } catch (DuplicateKeyException duplicate) {
                Document existing = mongo.findOne(byKey(token, trimmedKey), Document.class, COLLECTION);
                if (existing == null) {
                    continue; // released concurrently — try once more
                }
                Date createdAt = existing.getDate("createdAt");
                if (createdAt != null && createdAt.toInstant().plus(TTL).isBefore(now)) {
                    // Expired but not yet reaped by the TTL monitor: treat as unused.
                    mongo.remove(Query.query(Criteria.where("_id").is(existing.get("_id"))), COLLECTION);
                    continue;
                }
                return replayOrReject(existing, requestHash);
            }
            return runAndStore(recordId, action);
        }
        throw new IntegrationApiException(HttpStatus.CONFLICT, "A request with this Idempotency-Key is in progress");
    }

    private ResponseEntity<Object> runAndStore(ObjectId recordId, Supplier<ResponseEntity<?>> action) {
        ResponseEntity<?> response;
        try {
            response = action.get();
        } catch (RuntimeException ex) {
            release(recordId);
            throw ex;
        }
        if (!response.getStatusCode().is2xxSuccessful()) {
            release(recordId);
            @SuppressWarnings("unchecked")
            ResponseEntity<Object> passthrough = (ResponseEntity<Object>) response;
            return passthrough;
        }
        Update update = new Update()
                .set("state", "completed")
                .set("status", response.getStatusCode().value())
                .set("body", response.getBody() == null ? null : objectMapper.writeValueAsString(response.getBody()))
                .set("etag", response.getHeaders().getETag())
                .set(
                        "location",
                        response.getHeaders().getLocation() == null
                                ? null
                                : response.getHeaders().getLocation().toString());
        mongo.updateFirst(Query.query(Criteria.where("_id").is(recordId)), update, COLLECTION);
        @SuppressWarnings("unchecked")
        ResponseEntity<Object> stored = (ResponseEntity<Object>) response;
        return stored;
    }

    private ResponseEntity<Object> replayOrReject(Document existing, String requestHash) {
        if (!requestHash.equals(existing.getString("requestHash"))) {
            throw new IntegrationApiException(
                    HttpStatus.UNPROCESSABLE_CONTENT, "Idempotency-Key was already used for a different request");
        }
        if (!"completed".equals(existing.getString("state"))) {
            throw new IntegrationApiException(
                    HttpStatus.CONFLICT, "A request with this Idempotency-Key is still in progress");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.set(REPLAYED_HEADER, "true");
        if (existing.getString("etag") != null) {
            headers.setETag(existing.getString("etag"));
        }
        if (existing.getString("location") != null) {
            headers.set(HttpHeaders.LOCATION, existing.getString("location"));
        }
        String body = existing.getString("body");
        if (body == null) {
            return ResponseEntity.status(existing.getInteger("status"))
                    .headers(headers)
                    .build();
        }
        headers.setContentType(MediaType.APPLICATION_JSON);
        return ResponseEntity.status(existing.getInteger("status"))
                .headers(headers)
                .body(objectMapper.readTree(body));
    }

    private void release(ObjectId recordId) {
        mongo.remove(Query.query(Criteria.where("_id").is(recordId)), COLLECTION);
    }

    private static Query byKey(IntegrationTokenClaims token, String key) {
        return Query.query(Criteria.where("userId")
                .is(token.userId())
                .and("clientId")
                .is(token.clientId())
                .and("key")
                .is(key));
    }

    private String requestHash(HttpServletRequest request, Object body) {
        String ifMatch = request.getHeader(HttpHeaders.IF_MATCH);
        String canonical = request.getMethod()
                + "\n" + request.getRequestURI()
                + "\n" + (ifMatch == null ? "" : ifMatch.trim())
                + "\n" + (body == null ? "" : objectMapper.writeValueAsString(body));
        return hasher.sha256(canonical);
    }
}
