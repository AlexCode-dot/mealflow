package com.mealflow.appapi.shoppingLists.service;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;

import com.mealflow.appapi.recipes.domain.Ingredient;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListItem;
import com.mealflow.appapi.weeklyPlans.domain.PlanEntry;
import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** MF4: {@link ShoppingListGenerator#mergePlanCounting} counts what {@code mergePlan} does, and changes nothing. */
class ShoppingListGeneratorCountingTest {

    private final ShoppingListGenerator generator = new ShoppingListGenerator();

    private static WeeklyPlan plan(PlanEntry... entries) {
        return new WeeklyPlan(
                "user-1",
                "2026-11-09",
                List.of(entries),
                List.of("Breakfast", "Lunch", "Dinner"),
                Instant.now(),
                Instant.now());
    }

    private static List<ShoppingListItem> existing() {
        return new ArrayList<>(List.of(
                new ShoppingListItem("e-1", "Köttfärs", 400.0, "g", false),
                new ShoppingListItem("e-2", "Tortillas", 2.0, "st", true),
                new ShoppingListItem("e-3", "salt", null, null, false),
                new ShoppingListItem("e-4", "Mjölk", 1.0, "l", false),
                new ShoppingListItem("e-5", "Gräddfil", null, null, false)));
    }

    private static Map<String, Recipe> tacos() {
        Recipe recipe = new Recipe();
        recipe.setPortions(4);
        recipe.setIngredients(List.of(
                new Ingredient("Köttfärs", 1000.0, "g"),
                new Ingredient("Tortillas", 8.0, "st"),
                new Ingredient("Salt", null, null),
                new Ingredient("Gräddfil", 2.0, "dl"),
                new Ingredient("Lime", 1.0, "st")));
        return Map.of("r-1", recipe);
    }

    @Test
    void countsAddedLinesAndExistingLinesMergedInto() {
        WeeklyPlan plan = plan(new PlanEntry("p-1", "MON", "Dinner", "r-1", null, List.of(), List.of(), null, 2));

        ShoppingListGenerator.PlanMerge merge = generator.mergePlanCounting(existing(), plan, tacos(), Map.of());

        // Köttfärs summed (400 + 500 g), salt absorbed, Gräddfil given an amount -> 3 merged.
        // Tortillas (the existing line is checked) and Lime are new -> 2 added. Mjölk untouched.
        assertThat(merge.merged(), is(3));
        assertThat(merge.added(), is(2));
        assertThat(merge.items(), hasSize(7));
        ShoppingListItem mince = merge.items().stream()
                .filter(i -> i.getId().equals("e-1"))
                .findFirst()
                .orElseThrow();
        assertThat(mince.getQuantity(), is(closeTo(900.0, 0.0001)));
    }

    @Test
    void sameResultAsMergePlan() {
        WeeklyPlan plan = plan(new PlanEntry("p-1", "MON", "Dinner", "r-1", null, List.of("Ost"), List.of(), null, 6));

        List<ShoppingListItem> plain = generator.mergePlan(existing(), plan, tacos(), Map.of());
        List<ShoppingListItem> counted =
                generator.mergePlanCounting(existing(), plan, tacos(), Map.of()).items();

        assertThat(counted, hasSize(plain.size()));
        for (int i = 0; i < plain.size(); i++) {
            assertThat(counted.get(i).getName(), is(plain.get(i).getName()));
            assertThat(counted.get(i).getQuantity(), is(plain.get(i).getQuantity()));
            assertThat(counted.get(i).getUnit(), is(plain.get(i).getUnit()));
            assertThat(counted.get(i).isChecked(), is(plain.get(i).isChecked()));
        }
    }

    @Test
    void hasItems_isFalseForAPlanWithNothingToBuy() {
        Recipe empty = new Recipe();
        empty.setIngredients(List.of());
        WeeklyPlan nothing =
                plan(new PlanEntry("p-1", "MON", "Dinner", "r-empty", null, List.of(), List.of(), null, 2));

        assertThat(generator.hasItems(nothing, Map.of("r-empty", empty)), is(false));
        assertThat(generator.hasItems(plan(), Map.of()), is(false));
        assertThat(
                generator.hasItems(
                        plan(new PlanEntry("p-2", "TUE", "Dinner", null, "Tacos", List.of(), List.of(), null, null)),
                        Map.of()),
                is(true));
    }
}
