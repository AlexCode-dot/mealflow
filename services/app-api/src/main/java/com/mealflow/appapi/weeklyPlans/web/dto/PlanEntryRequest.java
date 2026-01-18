package com.mealflow.appapi.weeklyPlans.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record PlanEntryRequest(
    String id,
    @NotBlank @Size(max = 12) String day,
    @NotBlank @Size(max = 40) String section,
    @Size(max = 120) String recipeId,
    @Size(max = 120) String customTitle,
    List<@NotBlank @Size(max = 80) String> items,
    List<@NotBlank @Size(max = 80) String> extraItems,
    @Size(max = 500) String notes,
    @Min(1) Integer portions) {}
