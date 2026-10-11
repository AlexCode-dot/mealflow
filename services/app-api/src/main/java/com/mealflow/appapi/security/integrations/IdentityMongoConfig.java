package com.mealflow.appapi.security.integrations;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import jakarta.annotation.PreDestroy;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Read-only Mongo access to the identity-service database. Used to validate integration tokens
 * stored in the identity DB without an HTTP round-trip to identity-service.
 *
 * <p>Uses a raw {@link MongoClient} (not a {@code MongoTemplate}) — registering a {@code
 * MongoOperations} bean here would shadow Spring Boot's auto-configured primary template and break
 * Spring Data repository wiring elsewhere in app-api.
 */
@Configuration
public class IdentityMongoConfig {

    public static final String COLLECTION = "integration_tokens";

    /**
     * Spring Authorization Server grants (OAuth 2.0 authorizations) persisted by identity-service.
     * {@code _id} = grant id ({@code gid} claim), {@code principalName} = userId, {@code revoked}.
     */
    public static final String OAUTH_AUTHORIZATIONS_COLLECTION = "oauth2_authorizations";

    private final String configuredUri;
    private final String fallbackUri;
    private MongoClient client;

    public IdentityMongoConfig(
            @Value("${integration-tokens.identity-mongodb.uri:}") String configuredUri,
            @Value("${spring.data.mongodb.uri:${spring.mongodb.uri:}}") String fallbackUri) {
        this.configuredUri = configuredUri;
        this.fallbackUri = fallbackUri;
    }

    @Bean(name = "identityIntegrationTokens")
    MongoCollection<Document> identityIntegrationTokens() {
        return identityDatabase().getCollection(COLLECTION);
    }

    @Bean(name = "identityOAuthAuthorizations")
    MongoCollection<Document> identityOAuthAuthorizations() {
        return identityDatabase().getCollection(OAUTH_AUTHORIZATIONS_COLLECTION);
    }

    private synchronized MongoDatabase identityDatabase() {
        String uri = (configuredUri == null || configuredUri.isBlank()) ? fallbackUri : configuredUri;
        if (uri == null || uri.isBlank()) {
            throw new IllegalStateException(
                    "No Mongo URI configured for integration-tokens. Set integration-tokens.identity-mongodb.uri.");
        }
        if (client == null) {
            client = MongoClients.create(uri);
        }
        return client.getDatabase(databaseFromUri(uri));
    }

    @PreDestroy
    void close() {
        if (client != null) {
            client.close();
        }
    }

    private static String databaseFromUri(String uri) {
        // Extract the path segment from the connection string. Supports
        // mongodb://.../<db>?... and mongodb+srv://.../<db>
        int schemeEnd = uri.indexOf("://");
        int pathStart = schemeEnd >= 0 ? uri.indexOf('/', schemeEnd + 3) : -1;
        if (pathStart < 0 || pathStart == uri.length() - 1) {
            return "identity-db";
        }
        int queryStart = uri.indexOf('?', pathStart);
        String db = queryStart >= 0 ? uri.substring(pathStart + 1, queryStart) : uri.substring(pathStart + 1);
        return db.isBlank() ? "identity-db" : db;
    }
}
