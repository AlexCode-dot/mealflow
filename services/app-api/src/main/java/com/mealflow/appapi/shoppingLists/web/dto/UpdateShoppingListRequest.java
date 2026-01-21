package com.mealflow.appapi.shoppingLists.web.dto;

import jakarta.validation.constraints.Pattern;

public record UpdateShoppingListRequest(
        @Pattern(regexp = "(?i)active|archived", message = "must be active or archived")
        String status) {}
