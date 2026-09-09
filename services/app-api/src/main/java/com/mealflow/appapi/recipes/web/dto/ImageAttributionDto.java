package com.mealflow.appapi.recipes.web.dto;

import jakarta.validation.constraints.Size;

/**
 * Photo credit for a stock image (e.g. Pexels), passed through by the client when saving a recipe
 * that keeps its suggested stock photo, and returned wherever such an image is exposed.
 */
public record ImageAttributionDto(
        @Size(max = 40) String provider,
        @Size(max = 120) String photographer,
        @Size(max = 500) String photographerUrl,
        @Size(max = 500) String sourceUrl) {}
