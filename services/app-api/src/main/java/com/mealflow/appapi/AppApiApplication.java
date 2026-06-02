package com.mealflow.appapi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class AppApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(AppApiApplication.class, args);
    }
}
