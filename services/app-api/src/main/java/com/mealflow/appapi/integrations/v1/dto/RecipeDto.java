package com.mealflow.appapi.integrations.v1.dto;

import com.mealflow.appapi.recipes.web.dto.IngredientDto;
import java.time.Instant;
import java.util.List;

public record RecipeDto(
        String id,
        String title,
        String description,
        List<IngredientDto> ingredients,
        List<String> steps,
        Integer cookingTimeMinutes,
        Integer portions,
        String category,
        List<String> tags,
        String imageUrl,
        Instant createdAt,
        Instant updatedAt,
        Long version) {}
