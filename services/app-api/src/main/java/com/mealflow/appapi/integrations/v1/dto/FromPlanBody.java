package com.mealflow.appapi.integrations.v1.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code week} is {@code current} or {@code next} (case-insensitive); anything else answers 400. */
public record FromPlanBody(@NotBlank @Size(max = 12) String week) {}
