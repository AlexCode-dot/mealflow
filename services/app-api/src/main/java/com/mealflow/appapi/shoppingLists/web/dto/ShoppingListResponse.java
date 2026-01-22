package com.mealflow.appapi.shoppingLists.web.dto;

import java.time.Instant;
import java.util.List;

public record ShoppingListResponse(
        String id,
        String status,
        String weeklyPlanId,
        String title,
        List<ShoppingListItemResponse> items,
        Instant createdAt,
        Instant updatedAt) {}
