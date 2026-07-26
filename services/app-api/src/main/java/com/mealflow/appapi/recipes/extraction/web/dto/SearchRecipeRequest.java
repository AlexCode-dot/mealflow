package com.mealflow.appapi.recipes.extraction.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body for POST /api/recipes/extract/search — the name of a dish to write a recipe for. */
public record SearchRecipeRequest(@NotBlank @Size(max = 120) String query, String locale) {}
