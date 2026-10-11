package com.mealflow.appapi.integrations.v1.dto;

import com.mealflow.appapi.recipes.web.dto.IngredientDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateRecipeBody(
        @NotBlank @Size(max = 120) String title,
        @Size(max = 2000) String description,
        @Size(max = 100) List<@Valid IngredientDto> ingredients,
        @Size(max = 100) List<@NotBlank @Size(max = 500) String> steps,
        @Min(0) @Max(10_000) Integer cookingTimeMinutes,
        @Min(0) @Max(1_000) Integer portions,
        @Size(max = 80) String category,
        @Size(max = 10) List<@NotBlank @Size(max = 40) String> tags) {}
