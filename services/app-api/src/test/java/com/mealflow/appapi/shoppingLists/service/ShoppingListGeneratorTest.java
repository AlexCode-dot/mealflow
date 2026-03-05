package com.mealflow.appapi.shoppingLists.service;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.mealflow.appapi.recipes.domain.Ingredient;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListItem;
import com.mealflow.appapi.weeklyPlans.domain.PlanEntry;
import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ShoppingListGeneratorTest {

    @Test
    void mergePlan_shouldMergeByNameAndUnit_andScalePortions() {
        ShoppingListGenerator generator = new ShoppingListGenerator();

        ShoppingListItem existingPasta = new ShoppingListItem("item-1", "Pasta", 100.0, "g", false);
        List<ShoppingListItem> existingItems = List.of(existingPasta);

        Recipe recipe = new Recipe();
        recipe.setIngredients(List.of(new Ingredient("Pasta", 500.0, "g"), new Ingredient("Tomato", 2.0, "pcs")));
        recipe.setPortions(2);

        PlanEntry entry = new PlanEntry(
                "entry-1", "MON", "Dinner", "recipe-1", null, List.of("Olive oil"), List.of("Basil"), null, 4);

        WeeklyPlan plan = new WeeklyPlan(
                "user-1",
                "2024-12-09",
                List.of(entry),
                List.of("Breakfast", "Lunch", "Dinner"),
                Instant.now(),
                Instant.now());

        List<ShoppingListItem> merged = generator.mergePlan(existingItems, plan, Map.of("recipe-1", recipe));

        assertThat(merged, hasSize(4));

        ShoppingListItem pasta = findItem(merged, "Pasta", "g");
        assertThat(pasta.getQuantity(), is(closeTo(1100.0, 0.0001)));

        ShoppingListItem tomato = findItem(merged, "Tomato", "pcs");
        assertThat(tomato.getQuantity(), is(closeTo(4.0, 0.0001)));

        ShoppingListItem oliveOil = findItem(merged, "Olive oil", null);
        assertThat(oliveOil.getQuantity(), nullValue());
        assertThat(oliveOil.getUnit(), nullValue());

        ShoppingListItem basil = findItem(merged, "Basil", null);
        assertThat(basil.getQuantity(), nullValue());
        assertThat(basil.getUnit(), nullValue());
    }

    @Test
    void mergePlan_shouldFallbackToCustomTitle_whenCustomMealHasNoItems() {
        ShoppingListGenerator generator = new ShoppingListGenerator();

        PlanEntry customNoItems =
                new PlanEntry("entry-1", "MON", "Dinner", null, "Tacos", List.of(), List.of(), null, null);

        WeeklyPlan plan = new WeeklyPlan(
                "user-1",
                "2024-12-09",
                List.of(customNoItems),
                List.of("Breakfast", "Lunch", "Dinner"),
                Instant.now(),
                Instant.now());

        List<ShoppingListItem> merged = generator.mergePlan(List.of(), plan, Map.of());

        assertThat(merged, hasSize(1));
        ShoppingListItem tacos = findItem(merged, "Tacos", null);
        assertThat(tacos.getQuantity(), nullValue());
        assertThat(tacos.getUnit(), nullValue());
    }

    @Test
    void mergePlan_shouldNotAddCustomTitle_whenCustomMealAlreadyHasItems() {
        ShoppingListGenerator generator = new ShoppingListGenerator();

        PlanEntry customWithItems = new PlanEntry(
                "entry-1", "MON", "Dinner", null, "Tacos", List.of("Eggs"), List.of(), null, null);

        WeeklyPlan plan = new WeeklyPlan(
                "user-1",
                "2024-12-09",
                List.of(customWithItems),
                List.of("Breakfast", "Lunch", "Dinner"),
                Instant.now(),
                Instant.now());

        List<ShoppingListItem> merged = generator.mergePlan(List.of(), plan, Map.of());

        assertThat(merged, hasSize(1));
        assertThat(merged.get(0).getName(), is("Eggs"));
    }

    private ShoppingListItem findItem(List<ShoppingListItem> items, String name, String unit) {
        return items.stream()
                .filter(item -> item.getName().equals(name)
                        && ((unit == null && item.getUnit() == null) || unit.equals(item.getUnit())))
                .findFirst()
                .orElseThrow();
    }
}
