package com.mealflow.appapi;

import com.mealflow.appapi.support.MongoTestContainerConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
@SpringBootTest
class AppApiApplicationTests extends MongoTestContainerConfig {

  @Test
  void contextLoads() {}
}
