package com.mealflow.identity.security.token;

import java.time.Instant;

public record IssuedRefreshToken(String rawToken, String tokenHash, Instant expiresAt) {}
