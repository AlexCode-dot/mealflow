package com.mealflow.appapi.integrations.v1.dto;

/** {@code title} is the linked recipe's title or the entry's custom title. */
public record MealPlanEntryDto(
        String id,
        String day,
        String section,
        String recipeId,
        String customTitle,
        String title,
        String notes,
        Integer portions) {}
