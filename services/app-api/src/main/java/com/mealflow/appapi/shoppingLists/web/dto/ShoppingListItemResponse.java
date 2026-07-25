package com.mealflow.appapi.shoppingLists.web.dto;

public record ShoppingListItemResponse(
        String id, String name, Double quantity, String unit, boolean checked, String category) {}
