package com.mealflow.appapi.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;

/**
 * Shared Mongo for integration tests, "singleton container" pattern (same as identity-service):
 * started once per JVM and reaped by Ryuk. A per-class {@code @Container} lifecycle breaks once
 * several test classes share a cached Spring context — a later class would reuse a context whose
 * MongoClient points at the previous, already-stopped container ("Connection refused").
 *
 * <p>An externally provided Mongo (SPRING_DATA_MONGODB_URI / SPRING_MONGODB_URI /
 * APP_API_MONGODB_URI, e.g. in CI) still takes precedence and no container is started.
 */
public abstract class MongoTestContainerConfig {

    static final MongoDBContainer mongo = new MongoDBContainer("mongo:8.2");

    static {
        if (externalMongoUri() == null) {
            mongo.start();
        }
    }

    @DynamicPropertySource
    static void mongoProps(DynamicPropertyRegistry registry) {
        String mongoUri = externalMongoUri();
        if (mongoUri != null) {
            registry.add("spring.mongodb.uri", () -> mongoUri);
            registry.add("spring.data.mongodb.uri", () -> mongoUri);
            return;
        }
        registry.add("spring.mongodb.uri", mongo::getReplicaSetUrl);
        registry.add("spring.data.mongodb.uri", mongo::getReplicaSetUrl);
    }

    private static String externalMongoUri() {
        for (String name : new String[] {"SPRING_DATA_MONGODB_URI", "SPRING_MONGODB_URI", "APP_API_MONGODB_URI"}) {
            String value = System.getenv(name);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
