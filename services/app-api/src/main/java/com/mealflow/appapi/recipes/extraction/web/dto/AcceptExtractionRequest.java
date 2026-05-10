package com.mealflow.appapi.recipes.extraction.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AcceptExtractionRequest(
        @NotBlank @Size(max = 120) String title,
        @Size(max = 2000) String description,
        @Size(max = 500) String imageUrl,
        @Size(max = 200) String imageFileId,
        List<@Valid AcceptIngredientDto> ingredients,
        List<@NotBlank @Size(max = 500) String> steps,
        @Min(0) Integer cookingTimeMinutes,
        @Min(0) Integer portions,
        @Size(max = 80) String category) {

    public record AcceptIngredientDto(
            @NotBlank @Size(max = 80) String name,
            @Positive Double quantity,
            @Size(max = 20) String unit) {

        @AssertTrue(message = "unit is required when quantity is provided")
        public boolean isUnitValidWhenQuantityPresent() {
            if (quantity == null) return true;
            return unit != null && !unit.isBlank();
        }
    }
}
