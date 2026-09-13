package com.mealflow.appapi.recipes.web.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/**
 * Framing for a recipe image — see {@link com.mealflow.appapi.recipes.domain.ImageFocus}. The zoom
 * cap matches the app's editor; anything beyond it would only magnify compression artefacts.
 */
public record ImageFocusDto(
        @NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double x,
        @NotNull @DecimalMin("0.0") @DecimalMax("1.0") Double y,
        @NotNull @DecimalMin("1.0") @DecimalMax("4.0") Double zoom) {}
