package com.mealflow.identity;

import com.mealflow.identity.support.MongoTestContainerConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class IdentityServiceApplicationTests extends MongoTestContainerConfig {

    @Test
    void contextLoads() {}
}
