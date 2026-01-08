package com.mealflow.appapi.recipes.web.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record IngredientDto(
        @NotBlank @Size(max = 80) String name,
        @Positive Double quantity,
        @Size(max = 20) String unit) {

    @AssertTrue(message = "unit is required when quantity is provided")
    public boolean isUnitValidWhenQuantityPresent() {
        if (quantity == null) return true;
        return unit != null && !unit.isBlank();
    }

    // Optional: enforce symmetry (uncomment if you want)
    // @AssertTrue(message = "quantity is required when unit is provided")
    // public boolean isQuantityValidWhenUnitPresent() {
    //     if (unit == null || unit.isBlank()) return true;
    //     return quantity != null;
    // }
}
