package com.mealflow.appapi.shoppingLists.web.dto;

import jakarta.validation.constraints.Size;

public record CreateShoppingListRequest(
        @Size(max = 120) String weeklyPlanId,
        @Size(max = 80) String title) {}
