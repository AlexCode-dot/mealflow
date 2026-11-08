package com.mealflow.appapi.integrations.v1.dto;

import jakarta.validation.constraints.Size;

/**
 * Moves an entry within its plan. At least one of {@code day} / {@code section} must be set; an
 * omitted (or null) field is unchanged.
 */
public record MoveMealPlanEntryBody(
        @Size(max = 12) String day, @Size(max = 40) String section) {}
