package com.mealflow.identity.oauth.store;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * One OAuth grant ("authorization") of a connected app for one user. Token values are never
 * stored — only SHA-256 hashes for lookup. app-api reads {@code _id} (= JWT {@code gid}),
 * {@code principalName} and {@code revoked} to reject access tokens of disconnected grants.
 */
@Document(collection = "oauth2_authorizations")
public class OAuthAuthorizationDocument {

    @Id
    public String id;

    public String registeredClientId;

    @Indexed
    public String principalName;

    public String authorizationGrantType;
    public Set<String> authorizedScopes;

    /** Consent-step state (random, short-lived); only present between authorize and consent. */
    @Indexed(sparse = true)
    public String state;

    // Original authorization request (needed for redirect_uri and PKCE checks at the token endpoint).
    public String requestAuthorizationUri;
    public String requestClientId;
    public String requestRedirectUri;
    public Set<String> requestScopes;
    public String requestState;
    public Map<String, Object> requestAdditionalParameters;

    public TokenRecord authorizationCode;
    public TokenRecord accessToken;
    public TokenRecord refreshToken;

    @Indexed(sparse = true)
    public String authorizationCodeHash;

    @Indexed(sparse = true)
    public String accessTokenHash;

    @Indexed(sparse = true)
    public String refreshTokenHash;

    /** Hashes of rotated-out refresh tokens; presenting one again = reuse = family revoked. */
    @Indexed(sparse = true)
    public List<String> retiredRefreshTokenHashes = new ArrayList<>();

    /** True when the current access or refresh token has been invalidated (revoked/replay). */
    public boolean revoked;

    public Instant createdAt;
    public Instant updatedAt;

    public static class TokenRecord {
        public String hash;
        public Instant issuedAt;
        public Instant expiresAt;
        public boolean invalidated;
        public Set<String> scopes;
    }
}
