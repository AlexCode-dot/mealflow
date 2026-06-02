package com.mealflow.appapi.security.integrations;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Validates an opaque integration token (Bearer mfi_*). Caches positive lookups in Caffeine for 5
 * minutes to keep p50 well under the design's 5ms target.
 */
@Service
public class IntegrationTokenAuthService {

    private static final Duration CACHE_TTL = Duration.ofMinutes(5);

    private final MongoCollection<Document> tokens;
    private final TokenHasher hasher;
    private final Clock clock;
    private final Cache<String, Resolved> cache;

    public IntegrationTokenAuthService(
            @Qualifier("identityIntegrationTokens") MongoCollection<Document> tokens, TokenHasher hasher, Clock clock) {
        this.tokens = tokens;
        this.hasher = hasher;
        this.clock = clock;
        this.cache = Caffeine.newBuilder()
                .expireAfterWrite(CACHE_TTL)
                .maximumSize(10_000)
                .build();
    }

    public Optional<Resolved> resolve(String rawToken) {
        String hash = hasher.sha256(rawToken);
        Instant now = clock.instant();

        Resolved cached = cache.getIfPresent(hash);
        if (cached != null) {
            // Re-check expiry on every request — the row hasn't changed but time has.
            if (cached.expiresAt() != null && cached.expiresAt().isBefore(now)) {
                cache.invalidate(hash);
                return Optional.empty();
            }
            return Optional.of(cached);
        }

        Document doc = tokens.find(Filters.eq("tokenHash", hash)).first();
        if (doc == null || doc.get("revokedAt") != null) {
            return Optional.empty();
        }

        Instant expiresAt = readInstant(doc.get("expiresAt"));
        if (expiresAt != null && expiresAt.isBefore(now)) {
            return Optional.empty();
        }

        @SuppressWarnings("unchecked")
        List<String> scopes = (List<String>) doc.get("scopes");
        Resolved resolved = new Resolved(
                doc.getString("_id"), doc.getString("userId"), hash, scopes == null ? List.of() : scopes, expiresAt);
        cache.put(hash, resolved);
        return Optional.of(resolved);
    }

    private static Instant readInstant(Object raw) {
        if (raw == null) return null;
        if (raw instanceof Instant i) return i;
        if (raw instanceof Date d) return d.toInstant();
        return null;
    }

    /** Drops the cache entry so revocations take effect on the next request. */
    public void invalidate(String tokenHash) {
        cache.invalidate(tokenHash);
    }

    @Async
    public void recordLastUsed(String tokenHash) {
        Instant now = clock.instant();
        tokens.updateOne(Filters.eq("tokenHash", tokenHash), Updates.set("lastUsedAt", now));
    }

    public record Resolved(String tokenId, String userId, String tokenHash, List<String> scopes, Instant expiresAt) {}
}
