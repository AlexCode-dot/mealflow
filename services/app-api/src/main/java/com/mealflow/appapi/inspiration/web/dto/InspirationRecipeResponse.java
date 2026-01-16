package com.mealflow.appapi.inspiration.web.dto;

import java.util.List;

public record InspirationRecipeResponse(
        String id,
        String title,
        String imageUrl,
        String category,
        String area,
        List<InspirationIngredientResponse> ingredients,
        List<String> steps) {}
