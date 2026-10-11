package com.mealflow.appapi.integrations.v1.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Exactly one of {@code recipeId} / {@code customTitle} must be set. */
public record AddMealPlanEntryBody(
        @NotBlank @Size(max = 12) String day,
        @NotBlank @Size(max = 40) String section,
        @Size(max = 120) String recipeId,
        @Size(max = 120) String customTitle,
        @Size(max = 500) String notes,
        @Min(1) @Max(1_000) Integer portions) {}
