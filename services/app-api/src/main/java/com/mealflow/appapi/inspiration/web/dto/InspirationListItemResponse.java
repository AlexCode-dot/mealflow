package com.mealflow.appapi.inspiration.web.dto;

public record InspirationListItemResponse(
        String id, String title, String imageUrl, String category, String area, Integer ingredientCount) {}
