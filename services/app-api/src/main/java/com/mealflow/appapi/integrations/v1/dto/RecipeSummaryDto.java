package com.mealflow.appapi.integrations.v1.dto;

import java.time.Instant;
import java.util.List;

public record RecipeSummaryDto(
        String id,
        String title,
        String category,
        List<String> tags,
        Integer cookingTimeMinutes,
        Integer portions,
        String imageUrl,
        Instant updatedAt,
        Long version) {}
