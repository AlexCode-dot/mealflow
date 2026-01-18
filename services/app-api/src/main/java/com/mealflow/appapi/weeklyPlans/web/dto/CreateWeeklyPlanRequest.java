package com.mealflow.appapi.weeklyPlans.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateWeeklyPlanRequest(
    @NotBlank
    @Size(max = 20)
    @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "must be ISO date (YYYY-MM-DD)")
    String weeklyStart,
    List<@Valid PlanEntryRequest> entries) {}
