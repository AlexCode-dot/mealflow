package com.mealflow.appapi.shoppingLists.service;

import com.mealflow.appapi.recipes.domain.Ingredient;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListItem;
import com.mealflow.appapi.weeklyPlans.domain.PlanEntry;
import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class ShoppingListGenerator {

    public List<ShoppingListItem> mergePlan(
            List<ShoppingListItem> existingItems,
            WeeklyPlan plan,
            Map<String, Recipe> recipesById) {
        List<ShoppingListItem> items = new ArrayList<>(existingItems == null ? List.of() : existingItems);

        Map<String, ShoppingListItem> mergeableByKey = new HashMap<>();
        for (ShoppingListItem item : items) {
            if (isMergeable(item)) {
                mergeableByKey.put(normalizedKey(item.getName(), item.getUnit()), item);
            }
        }

        List<PlanEntry> entries = plan.getEntries() == null ? List.of() : plan.getEntries();
        for (PlanEntry entry : entries) {
            addPlanItems(items, entry.getItems());
            addPlanItems(items, entry.getExtraItems());

            if (entry.getRecipeId() == null || entry.getRecipeId().isBlank()) {
                continue;
            }

            Recipe recipe = recipesById.get(entry.getRecipeId());
            if (recipe == null) {
                throw new ShoppingListValidationException("Weekly plan references recipes not found");
            }

            for (Ingredient ingredient : recipe.getIngredients()) {
                addIngredientItem(items, mergeableByKey, ingredient, recipe, entry);
            }
        }

        return items;
    }

    private void addPlanItems(List<ShoppingListItem> items, List<String> planItems) {
        if (planItems == null) {
            return;
        }
        for (String name : planItems) {
            String normalized = normalizeName(name);
            if (normalized.isBlank()) {
                continue;
            }
            items.add(new ShoppingListItem(UUID.randomUUID().toString(), normalized, null, null, false));
        }
    }

    private void addIngredientItem(
            List<ShoppingListItem> items,
            Map<String, ShoppingListItem> mergeableByKey,
            Ingredient ingredient,
            Recipe recipe,
            PlanEntry entry) {
        String name = normalizeName(ingredient.getName());
        if (name.isBlank()) {
            return;
        }
        Double quantity = ingredient.getQuantity();
        String unit = normalizeUnit(ingredient.getUnit());

        Double scaledQuantity = scaleQuantity(quantity, recipe.getPortions(), entry.getPortions());
        ShoppingListItem incoming = new ShoppingListItem(
                UUID.randomUUID().toString(), name, scaledQuantity, unit, false);

        if (isMergeable(incoming)) {
            String key = normalizedKey(incoming.getName(), incoming.getUnit());
            ShoppingListItem existing = mergeableByKey.get(key);
            if (existing != null) {
                existing.setQuantity(existing.getQuantity() + incoming.getQuantity());
                return;
            }
            items.add(incoming);
            mergeableByKey.put(key, incoming);
            return;
        }

        items.add(incoming);
    }

    private Double scaleQuantity(Double quantity, Integer recipePortions, Integer entryPortions) {
        if (quantity == null) {
            return null;
        }
        if (recipePortions == null || entryPortions == null) {
            return quantity;
        }
        if (recipePortions <= 0) {
            return quantity;
        }
        return quantity * (entryPortions.doubleValue() / recipePortions.doubleValue());
    }

    private boolean isMergeable(ShoppingListItem item) {
        return item.getQuantity() != null && hasUnit(item.getUnit());
    }

    private boolean hasUnit(String unit) {
        return unit != null && !unit.isBlank();
    }

    private String normalizedKey(String name, String unit) {
        String normalizedName = normalizeName(name).toLowerCase(Locale.ROOT);
        String normalizedUnit = normalizeUnit(unit).toLowerCase(Locale.ROOT);
        return normalizedName + "::" + normalizedUnit;
    }

    private String normalizeName(String name) {
        if (name == null) {
            return "";
        }
        return name.trim();
    }

    private String normalizeUnit(String unit) {
        if (unit == null) {
            return null;
        }
        String trimmed = unit.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

}
