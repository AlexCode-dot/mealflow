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
        registry.add("spring.mongodb.uri", mongo::getReplicaSetUrl);
    }
}
