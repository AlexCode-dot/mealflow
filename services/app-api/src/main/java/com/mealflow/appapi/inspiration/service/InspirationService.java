package com.mealflow.appapi.inspiration.service;

import com.mealflow.appapi.inspiration.provider.MealDbClient;
import com.mealflow.appapi.inspiration.provider.MealDbMeal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class InspirationService {

    private static final int DEFAULT_LIMIT = 24;
    private static final int MAX_LIMIT = 60;
    private static final int MAX_RANDOM = 12;

    private final MealDbClient mealDbClient;

    public InspirationService(MealDbClient mealDbClient) {
        this.mealDbClient = mealDbClient;
    }

    public List<MealDbMeal> list(String query, String ingredient, String category, String area, Integer limit) {
        List<MealDbMeal> meals;
        if (StringUtils.hasText(query)) {
            meals = mealDbClient.searchByName(query.trim());
        } else if (StringUtils.hasText(ingredient)) {
            meals = mealDbClient.filterByIngredient(ingredient.trim());
        } else if (StringUtils.hasText(category)) {
            meals = mealDbClient.filterByCategory(category.trim());
        } else if (StringUtils.hasText(area)) {
            meals = mealDbClient.filterByArea(area.trim());
        } else {
            meals = mealDbClient.searchByName("");
        }

        int capped = resolveLimit(limit);
        if (meals.size() <= capped) {
            return meals;
        }
        return meals.subList(0, capped);
    }

    private int resolveLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }

    public MealDbMeal get(String id) {
        MealDbMeal meal = mealDbClient.lookupById(id);
        if (meal == null) {
            throw new InspirationNotFoundException("Inspiration recipe not found");
        }
        return meal;
    }

    public List<MealDbMeal> random(int count) {
        int target = Math.min(Math.max(count, 1), MAX_RANDOM);
        List<MealDbMeal> results = new java.util.ArrayList<>();
        java.util.Set<String> ids = new java.util.HashSet<>();

        for (int i = 0; i < target; i++) {
            MealDbMeal meal = mealDbClient.random();
            if (meal == null || meal.id() == null || !ids.add(meal.id())) {
                continue;
            }
            results.add(meal);
        }

        return results;
    }
}
