package com.mealflow.appapi.integrations.v1.dto;

import java.time.Instant;
import java.util.List;

/**
 * A week's meal plan. {@code id}, {@code updatedAt} and {@code version} are null when the user has
 * no plan for that week yet (adding an entry creates it).
 */
public record MealPlanDto(
        String id,
        String weekStart,
        List<String> sections,
        List<MealPlanEntryDto> entries,
        Instant updatedAt,
        Long version) {}
