package com.mealflow.appapi.inspiration.service;

import com.mealflow.appapi.inspiration.provider.MealDbClient;
import com.mealflow.appapi.inspiration.provider.MealDbMeal;
import io.sentry.Sentry;
import io.sentry.SentryLevel;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class InspirationService {

    private static final Logger logger = LoggerFactory.getLogger(InspirationService.class);
    private static final int DEFAULT_LIMIT = 24;
    private static final int MAX_LIMIT = 60;
    private static final int MAX_RANDOM = 12;
    private static final int RANDOM_FALLBACK_MAX_ATTEMPTS_MULTIPLIER = 3;
    private static final long RANDOM_FALLBACK_REPORT_INTERVAL_MS = 5 * 60 * 1000;
    private static volatile long lastFallbackReportAt = 0;

    private final MealDbClient mealDbClient;

    public InspirationService(MealDbClient mealDbClient) {
        this.mealDbClient = mealDbClient;
    }

    public List<MealDbMeal> list(String query, String ingredient, String category, String area, Integer limit) {
        List<MealDbMeal> meals;
        boolean noFilters = false;
        if (StringUtils.hasText(query)) {
            meals = mealDbClient.searchByName(query.trim());
        } else if (StringUtils.hasText(ingredient)) {
            meals = mealDbClient.filterByIngredient(ingredient.trim());
        } else if (StringUtils.hasText(category)) {
            meals = mealDbClient.filterByCategory(category.trim());
        } else if (StringUtils.hasText(area)) {
            meals = mealDbClient.filterByArea(area.trim());
        } else {
            noFilters = true;
            meals = mealDbClient.searchByName("");
        }

        int capped = resolveLimit(limit);
        if (noFilters) {
            meals = new java.util.ArrayList<>(meals);
            java.util.Collections.shuffle(meals);
        }
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

        // Prefer premium batch endpoint; fallback to single random calls if needed.
        try {
            List<MealDbMeal> selection = mealDbClient.randomSelection();
            if (selection != null && !selection.isEmpty()) {
                selection = new java.util.ArrayList<>(selection);
                java.util.Collections.shuffle(selection);
                for (MealDbMeal meal : selection) {
                    if (meal == null || meal.id() == null || !ids.add(meal.id())) {
                        continue;
                    }
                    results.add(meal);
                    if (results.size() >= target) {
                        return results;
                    }
                }
            }
        } catch (Exception ignored) {
            // Fall back to per-item random below.
        }

        maybeReportRandomFallback();
        int maxAttempts = Math.max(target, 1) * RANDOM_FALLBACK_MAX_ATTEMPTS_MULTIPLIER;
        for (int i = 0; i < maxAttempts && results.size() < target; i++) {
            MealDbMeal meal = mealDbClient.random();
            if (meal == null || meal.id() == null || !ids.add(meal.id())) {
                continue;
            }
            results.add(meal);
        }

        return results;
    }

    private static void maybeReportRandomFallback() {
        long now = System.currentTimeMillis();
        long last = lastFallbackReportAt;
        if (now - last < RANDOM_FALLBACK_REPORT_INTERVAL_MS) {
            return;
        }
        lastFallbackReportAt = now;
        logger.debug("MealDB random selection unavailable; falling back to per-item random calls");
        Sentry.captureMessage(
                "MealDB random selection unavailable; falling back to per-item random calls",
                scope -> {
                    scope.setLevel(SentryLevel.WARNING);
                    scope.setTag("external_api", "mealdb");
                    scope.setTag("fallback", "randomselection");
                });
    }
}
