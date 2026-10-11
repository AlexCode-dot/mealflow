package com.mealflow.appapi.integrations.v1.dto;

import java.time.Instant;
import java.util.List;

public record ShoppingListDto(
        String id, String title, String status, List<ShoppingListItemDto> items, Instant updatedAt, Long version) {}
