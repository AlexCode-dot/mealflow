package com.mealflow.appapi.security.oauth;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import java.time.Duration;
import java.util.Objects;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Treats an integration access token as valid only while its OAuth grant is active in the identity
 * DB: the {@code oauth2_authorizations} document with {@code _id = gid} must exist, belong to the
 * token's {@code sub} ({@code principalName}) and not be {@code revoked}. Positive lookups are
 * cached briefly so a revocation (disconnect, refresh-token reuse) takes effect within the cache TTL
 * (default 30 s). Negative results are never cached.
 */
@Component
public class OAuthGrantValidator implements OAuth2TokenValidator<Jwt> {

    private static final OAuth2Error GRANT_INACTIVE =
            new OAuth2Error(OAuth2ErrorCodes.INVALID_TOKEN, "Authorization grant is not active", null);

    private final MongoCollection<Document> authorizations;
    private final Cache<String, Boolean> activeGrants;

    public OAuthGrantValidator(
            @Qualifier("identityOAuthAuthorizations") MongoCollection<Document> authorizations,
            @Value("${integrations.grant-cache-seconds:30}") long cacheSeconds) {
        this.authorizations = authorizations;
        this.activeGrants = Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofSeconds(Math.min(Math.max(cacheSeconds, 0), 30)))
                .maximumSize(10_000)
                .build();
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        String grantId = jwt.getClaimAsString(IntegrationTokenClaims.GRANT_ID);
        String userId = jwt.getSubject();
        if (grantId == null || userId == null) {
            return OAuth2TokenValidatorResult.failure(GRANT_INACTIVE);
        }
        String cacheKey = grantId + "|" + userId;
        if (activeGrants.getIfPresent(cacheKey) != null) {
            return OAuth2TokenValidatorResult.success();
        }

        Document grant = authorizations.find(Filters.eq("_id", grantId)).first();
        if (grant == null
                || !Objects.equals(grant.get("principalName"), userId)
                || Boolean.TRUE.equals(grant.get("revoked"))) {
            return OAuth2TokenValidatorResult.failure(GRANT_INACTIVE);
        }
        activeGrants.put(cacheKey, Boolean.TRUE);
        return OAuth2TokenValidatorResult.success();
    }

    /** Drops every cached grant (tests / operational use). */
    public void invalidateAll() {
        activeGrants.invalidateAll();
    }
}
