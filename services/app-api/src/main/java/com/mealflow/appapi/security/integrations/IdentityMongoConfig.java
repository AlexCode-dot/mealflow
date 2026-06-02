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

    private MongoClient client;

    @Bean(name = "identityIntegrationTokens")
    MongoCollection<Document> identityIntegrationTokens(
            @Value("${integration-tokens.identity-mongodb.uri:}") String configured,
            @Value("${spring.data.mongodb.uri:${spring.mongodb.uri:}}") String fallback) {
        String uri = (configured == null || configured.isBlank()) ? fallback : configured;
        if (uri == null || uri.isBlank()) {
            throw new IllegalStateException(
                    "No Mongo URI configured for integration-tokens. Set integration-tokens.identity-mongodb.uri.");
        }
        this.client = MongoClients.create(uri);
        MongoDatabase db = client.getDatabase(databaseFromUri(uri));
        return db.getCollection(COLLECTION);
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
