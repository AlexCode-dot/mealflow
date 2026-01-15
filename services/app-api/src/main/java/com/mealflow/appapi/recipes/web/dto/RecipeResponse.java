package com.mealflow.appapi.recipes.web.dto;

import java.time.Instant;
import java.util.List;

public record RecipeResponse(
        String id,
        String title,
        String description,
        List<IngredientDto> ingredients,
        List<String> steps,
        Integer cookingTimeMinutes,
        Integer portions,
        String category,
        boolean fromExternal,
        Instant createdAt,
        Instant updatedAt) {}
