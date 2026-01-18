package com.mealflow.appapi.weeklyPlans.web.dto;

import java.time.Instant;
import java.util.List;

public record WeeklyPlanResponse(
        String id, String weeklyStart, List<PlanEntryResponse> entries, Instant createdAt, Instant updatedAt) {}
