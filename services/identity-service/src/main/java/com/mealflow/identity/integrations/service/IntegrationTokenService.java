package com.mealflow.identity.integrations.service;

import com.mealflow.identity.integrations.domain.IntegrationToken;
import com.mealflow.identity.integrations.error.IntegrationTokenNotFoundException;
import com.mealflow.identity.integrations.error.InvalidScopeException;
import com.mealflow.identity.integrations.repository.IntegrationTokenRepository;
import com.mealflow.identity.token.service.TokenHashService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

@Service
public class IntegrationTokenService {

    /**
     * Allowed scope strings. Adding a new area means adding a value here AND wiring the
     * area→URL-prefix mapping in app-api's IntegrationTokenAuthenticationFilter.
     */
    public static final Set<String> ALLOWED_SCOPES = Set.of("recipes:read", "recipes:write");

    /** Default scopes when the caller doesn't specify any. */
    private static final List<String> DEFAULT_SCOPES = List.of("recipes:read", "recipes:write");

    private final IntegrationTokenRepository repository;
    private final IntegrationTokenGenerator generator;
    private final TokenHashService tokenHashService;
    private final MongoTemplate mongoTemplate;
    private final Clock clock;

    public IntegrationTokenService(
            IntegrationTokenRepository repository,
            IntegrationTokenGenerator generator,
            TokenHashService tokenHashService,
            MongoTemplate mongoTemplate,
            Clock clock) {
        this.repository = repository;
        this.generator = generator;
        this.tokenHashService = tokenHashService;
        this.mongoTemplate = mongoTemplate;
        this.clock = clock;
    }

    public IssuedIntegrationToken issue(
            String userId, String name, List<String> requestedScopes, Integer expiresInDays) {
        List<String> scopes = normalizeScopes(requestedScopes);

        Instant now = clock.instant();
        Instant expiresAt = expiresInDays == null ? null : now.plus(Duration.ofDays(expiresInDays));

        String rawToken = generator.generate();
        String tokenHash = tokenHashService.sha256(rawToken);
        String preview = generator.preview(rawToken);

        IntegrationToken doc = new IntegrationToken(userId, name, tokenHash, preview, scopes, now, expiresAt);
        IntegrationToken saved = repository.save(doc);

        return new IssuedIntegrationToken(saved, rawToken);
    }

    public List<IntegrationToken> listForUser(String userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public void revoke(String userId, String id) {
        Instant now = clock.instant();

        Query q = new Query(new Criteria()
                .andOperator(
                        Criteria.where("_id").is(id),
                        Criteria.where("userId").is(userId),
                        Criteria.where("revokedAt").is(null)));
        Update u = new Update().set("revokedAt", now);

        IntegrationToken updated = mongoTemplate.findAndModify(
                q, u, FindAndModifyOptions.options().returnNew(true), IntegrationToken.class);

        if (updated == null) {
            // Either it doesn't exist for this user, or it's already revoked. Treat both as not-found
            // so we don't leak whether the id exists for someone else.
            repository
                    .findByIdAndUserId(id, userId)
                    .orElseThrow(() -> new IntegrationTokenNotFoundException("Integration token not found"));
        }
    }

    private static List<String> normalizeScopes(List<String> requested) {
        if (requested == null || requested.isEmpty()) {
            return DEFAULT_SCOPES;
        }
        for (String scope : requested) {
            if (!ALLOWED_SCOPES.contains(scope)) {
                throw new InvalidScopeException("Unknown scope: " + scope);
            }
        }
        return List.copyOf(requested);
    }

    public record IssuedIntegrationToken(IntegrationToken token, String rawToken) {}
}
