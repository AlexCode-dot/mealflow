package com.mealflow.identity.web.integrations.dto;

import java.time.Instant;
import java.util.List;

public record IssuedIntegrationTokenResponse(
        String id,
        String name,
        String token,
        String tokenPreview,
        List<String> scopes,
        Instant createdAt,
        Instant expiresAt) {}
