package com.mealflow.appapi.integrations.v1.dto;

import java.util.List;

/** One page of recipes; {@code nextCursor} is opaque and null on the last page. */
public record RecipePageDto(List<RecipeSummaryDto> items, String nextCursor) {}
