package com.mealflow.appapi.recipes.extraction.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body for POST /api/recipes/extract/text — a spoken/typed recipe transcript. */
public record ExtractTextRequest(@NotBlank @Size(max = 5000) String transcript, String locale) {}
