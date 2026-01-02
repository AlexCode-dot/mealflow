package com.mealflow.identity.token.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "refresh_tokens")
public class RefreshToken {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed(unique = true)
    private String tokenHash;

    // TTL cleanup: expire at the timestamp stored in expiresAt.
    @Indexed(expireAfter = "0s")
    private Instant expiresAt;

    private boolean revoked;

    private String replacedByTokenHash;

    private Instant createdAt;

    protected RefreshToken() {}

    public RefreshToken(
            String userId,
            String tokenHash,
            Instant expiresAt,
            boolean revoked,
            String replacedByTokenHash,
            Instant createdAt) {
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.revoked = revoked;
        this.replacedByTokenHash = replacedByTokenHash;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public boolean isRevoked() {
        return revoked;
    }

    public String getReplacedByTokenHash() {
        return replacedByTokenHash;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public boolean isExpired(Instant now) {
        return expiresAt.isBefore(now);
    }

    public void revoke(String replacedByTokenHash) {
        this.revoked = true;
        this.replacedByTokenHash = replacedByTokenHash;
    }
}
