package com.mealflow.appapi.integrations.v1.dto;

public record ShoppingListItemDto(
        String id, String name, Double quantity, String unit, boolean checked, String category) {}
