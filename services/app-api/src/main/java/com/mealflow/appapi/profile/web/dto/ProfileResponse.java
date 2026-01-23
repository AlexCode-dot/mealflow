package com.mealflow.appapi.profile.web.dto;

import java.time.Instant;

public record ProfileResponse(
        String id, String displayName, String avatarUrl, String theme, Instant createdAt, Instant updatedAt) {}
