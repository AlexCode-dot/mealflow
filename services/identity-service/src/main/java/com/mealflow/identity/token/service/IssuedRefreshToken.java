package com.mealflow.identity.token.service;

import java.time.Instant;

public record IssuedRefreshToken(String userId, String rawToken, String tokenHash, Instant expiresAt) {}
