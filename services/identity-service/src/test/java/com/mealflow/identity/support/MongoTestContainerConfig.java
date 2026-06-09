package com.mealflow.identity.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;

/**
 * Shared Mongo for integration tests, using the Testcontainers "singleton container" pattern.
 *
 * <p>The container is started once in a static initializer and intentionally never stopped per
 * class — Ryuk reaps it when the JVM exits. This is deliberate: multiple {@code @SpringBootTest}
 * classes extend this base and share a cached Spring application context. If the container were
 * managed with {@code @Testcontainers}/{@code @Container} (start in {@code beforeAll}, stop in
 * {@code afterAll}), a later test class could reuse a cached context whose {@code MongoClient}
 * still points at the previous, now-stopped container's mapped port — every Mongo operation then
 * fails with "Connection refused". Starting once keeps the mapped port stable for the whole run.
 */
public abstract class MongoTestContainerConfig {

    static final MongoDBContainer mongo = new MongoDBContainer("mongo:8.2");

    static {
        mongo.start();
    }

    @DynamicPropertySource
    static void mongoProps(DynamicPropertyRegistry registry) {
        registry.add("spring.mongodb.uri", mongo::getReplicaSetUrl);
    }
}
