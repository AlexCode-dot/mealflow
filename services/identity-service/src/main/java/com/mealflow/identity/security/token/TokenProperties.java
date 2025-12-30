package com.mealflow.identity.security.token;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "jwt")
public record TokenProperties(int accessTokenTtlMinutes, int refreshTokenTtlDays, String issuer) {}
