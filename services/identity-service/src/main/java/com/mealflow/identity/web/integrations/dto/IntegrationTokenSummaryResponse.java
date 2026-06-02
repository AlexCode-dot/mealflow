package com.mealflow.identity.web.integrations.dto;

import java.time.Instant;
import java.util.List;

public record IntegrationTokenSummaryResponse(
        String id,
        String name,
        String tokenPreview,
        List<String> scopes,
        Instant createdAt,
        Instant lastUsedAt,
        Instant revokedAt,
        Instant expiresAt) {}
