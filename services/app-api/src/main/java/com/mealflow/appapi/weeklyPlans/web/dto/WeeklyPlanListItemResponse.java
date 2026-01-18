package com.mealflow.appapi.weeklyPlans.web.dto;

import java.time.Instant;

public record WeeklyPlanListItemResponse(
    String id,
    String weeklyStart,
    int entryCount,
    Instant createdAt,
    Instant updatedAt) {}
