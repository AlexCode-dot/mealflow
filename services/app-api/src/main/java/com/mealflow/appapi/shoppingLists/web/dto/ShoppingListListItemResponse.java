package com.mealflow.appapi.shoppingLists.web.dto;

import java.time.Instant;

public record ShoppingListListItemResponse(
        String id,
        String status,
        String weeklyPlanId,
        int itemCount,
        Instant createdAt,
        Instant updatedAt) {}
