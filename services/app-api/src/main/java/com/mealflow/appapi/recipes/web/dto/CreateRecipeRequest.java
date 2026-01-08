package com.mealflow.appapi.recipes.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateRecipeRequest(
        @NotBlank @Size(max = 120) String title,
        @Size(max = 2000) String description,
        List<@Valid IngredientDto> ingredients,
        List<@NotBlank @Size(max = 500) String> steps,
        Boolean fromExternal) {}
