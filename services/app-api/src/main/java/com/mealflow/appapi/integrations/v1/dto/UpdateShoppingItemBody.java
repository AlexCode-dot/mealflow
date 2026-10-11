package com.mealflow.appapi.integrations.v1.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateShoppingItemBody(@NotNull Boolean checked) {}
