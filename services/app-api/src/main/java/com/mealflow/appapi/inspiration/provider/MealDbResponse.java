package com.mealflow.appapi.inspiration.provider;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.util.List;

public record MealDbResponse(
        @JsonFormat(with = JsonFormat.Feature.ACCEPT_SINGLE_VALUE_AS_ARRAY)
        List<MealDbMeal> meals) {}
