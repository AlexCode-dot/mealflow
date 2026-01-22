package com.mealflow.appapi.shoppingLists.web.dto;

import java.time.Instant;

public record ShoppingListListItemResponse(
        String id,
        String status,
        String weeklyPlanId,
        String title,
        int itemCount,
        Instant createdAt,
        Instant updatedAt) {}
