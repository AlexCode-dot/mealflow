package com.mealflow.appapi.recipes.extraction.web.dto;

import java.util.List;

public record ExtractionDraftResponse(
        String title,
        String description,
        List<DraftIngredientDto> ingredients,
        List<String> steps,
        Integer cookingTimeMinutes,
        Integer portions,
        String category,
        String language,
        List<String> uncertainFields) {

    public record DraftIngredientDto(String name, Double quantity, String unit) {}
}
