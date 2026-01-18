package com.mealflow.appapi.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
public abstract class MongoTestContainerConfig {

    @Container
    static final MongoDBContainer mongo = new MongoDBContainer("mongo:8.2");

    @DynamicPropertySource
    static void mongoProps(DynamicPropertyRegistry registry) {
        String mongoUri = System.getenv("SPRING_DATA_MONGODB_URI");
        if (mongoUri == null || mongoUri.isBlank()) {
            mongoUri = System.getenv("SPRING_MONGODB_URI");
        }
        if (mongoUri == null || mongoUri.isBlank()) {
            mongoUri = System.getenv("APP_API_MONGODB_URI");
        }
        if (mongoUri != null && !mongoUri.isBlank()) {
            String configured = mongoUri;
            registry.add("spring.mongodb.uri", () -> configured);
            registry.add("spring.data.mongodb.uri", () -> configured);
            return;
        }
        registry.add("spring.mongodb.uri", mongo::getReplicaSetUrl);
        registry.add("spring.data.mongodb.uri", mongo::getReplicaSetUrl);
    }
}
