package com.mealflow.appapi.shoppingLists.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record AddShoppingListItemRequest(
        @NotBlank @Size(max = 80) String name,
        @PositiveOrZero Double quantity,
        @Size(max = 20) String unit) {}
