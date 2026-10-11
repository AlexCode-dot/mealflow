package com.mealflow.appapi.integrations.v1.dto;

import java.time.Instant;

public record ShoppingListSummaryDto(
        String id, String title, String status, int itemCount, int checkedCount, Instant updatedAt, Long version) {}
