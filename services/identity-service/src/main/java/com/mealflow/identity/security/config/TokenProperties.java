package com.mealflow.identity.security.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "jwt")
public record TokenProperties(int accessTokenTtlMinutes, int refreshTokenTtlDays, String issuer) {}
