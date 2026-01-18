package com.mealflow.appapi.weeklyPlans.web.dto;

import java.util.List;

public record PlanEntryResponse(
        String id,
        String day,
        String section,
        String recipeId,
        String customTitle,
        List<String> items,
        List<String> extraItems,
        String notes,
        Integer portions) {}
