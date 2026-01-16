package com.mealflow.appapi.recipes.web.dto;

public record RecipeListItemResponse(
        String id,
        String title,
        String description,
        String imageUrl,
        Integer cookingTimeMinutes,
        Integer ingredientCount,
        Integer portions,
        java.util.List<String> ingredientNames,
        String category,
        boolean fromExternal) {}
