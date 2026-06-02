package com.mealflow.appapi.security.integrations;

import java.time.Instant;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Read-side projection of the IntegrationToken record owned by the identity-service. The
 * authoritative copy lives in the identity database; app-api only reads from it via the
 * "identityMongoTemplate" bean to validate inbound integration tokens.
 */
@Document(collection = "integration_tokens")
public class IntegrationTokenDocument {

    @Id
    private String id;

    private String userId;
    private String name;
    private String tokenHash;
    private String tokenPreview;
    private List<String> scopes;
    private Instant createdAt;
    private Instant lastUsedAt;
    private Instant revokedAt;

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public List<String> getScopes() {
        return scopes;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }
}
