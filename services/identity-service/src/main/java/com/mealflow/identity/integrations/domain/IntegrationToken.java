package com.mealflow.identity.integrations.domain;

import java.time.Instant;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "integration_tokens")
@CompoundIndex(name = "userId_revokedAt", def = "{'userId': 1, 'revokedAt': 1}")
public class IntegrationToken {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String name;

    @Indexed(unique = true)
    private String tokenHash;

    private String tokenPreview;

    private List<String> scopes;

    private Instant createdAt;

    private Instant lastUsedAt;

    private Instant revokedAt;

    /** Null = never expires. */
    private Instant expiresAt;

    protected IntegrationToken() {}

    public IntegrationToken(
            String userId,
            String name,
            String tokenHash,
            String tokenPreview,
            List<String> scopes,
            Instant createdAt,
            Instant expiresAt) {
        this.userId = userId;
        this.name = name;
        this.tokenHash = tokenHash;
        this.tokenPreview = tokenPreview;
        this.scopes = scopes;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public String getTokenPreview() {
        return tokenPreview;
    }

    public List<String> getScopes() {
        return scopes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastUsedAt() {
        return lastUsedAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }
}
