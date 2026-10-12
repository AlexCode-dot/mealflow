package com.mealflow.appapi.integrations.v1.dto;

import java.time.Instant;
import java.util.List;

/**
 * A week's meal plan. When the user has no plan for that week yet (adding an entry creates it),
 * {@code id} and {@code updatedAt} are null and {@code version} is 0 (ETag {@code "0"}).
 */
public record MealPlanDto(
        String id,
        String weekStart,
        List<String> sections,
        List<MealPlanEntryDto> entries,
        Instant updatedAt,
        Long version) {}
