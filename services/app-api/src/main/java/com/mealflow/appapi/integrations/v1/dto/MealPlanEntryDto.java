package com.mealflow.appapi.integrations.v1.dto;

import java.util.List;

/**
 * {@code title} is the linked recipe's title or the entry's custom title. {@code items} and {@code
 * extraItems} (v1.2, read-only) are the entry's own shopping items as stored by the app: the things
 * the dinner needs besides (or, for a custom title, instead of) a recipe's ingredients. Never null.
 */
public record MealPlanEntryDto(
        String id,
        String day,
        String section,
        String recipeId,
        String customTitle,
        String title,
        String notes,
        Integer portions,
        List<String> items,
        List<String> extraItems) {}
