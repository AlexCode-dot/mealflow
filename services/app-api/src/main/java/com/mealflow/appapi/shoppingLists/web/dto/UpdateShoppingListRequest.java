package com.mealflow.appapi.shoppingLists.web.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateShoppingListRequest(
        @Pattern(regexp = "(?i)active|archived", message = "must be active or archived")
        String status,
        @Size(max = 80) String title) {}
