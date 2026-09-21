package com.mealflow.appapi.shoppingLists.service;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.mealflow.appapi.recipes.domain.Ingredient;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.shoppingLists.domain.ShoppingItemCategory;
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

        PlanEntry customWithItems =
                new PlanEntry("entry-1", "MON", "Dinner", null, "Tacos", List.of("Eggs"), List.of(), null, null);

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

    // --- Merging the same product across recipes ---

    private final ShoppingListGenerator generator = new ShoppingListGenerator();

    private static Recipe recipe(int portions, Ingredient... ingredients) {
        Recipe recipe = new Recipe();
        recipe.setIngredients(List.of(ingredients));
        recipe.setPortions(portions);
        return recipe;
    }

    /** A plan with one entry per recipe, each cooked for the recipe's own portion count. */
    private List<ShoppingListItem> generate(
            List<ShoppingListItem> existing, Map<String, NormalizedItemName> names, Recipe... recipes) {
        List<PlanEntry> entries = new java.util.ArrayList<>();
        Map<String, Recipe> byId = new java.util.HashMap<>();
        for (int i = 0; i < recipes.length; i++) {
            String id = "recipe-" + i;
            byId.put(id, recipes[i]);
            entries.add(
                    new PlanEntry("entry-" + i, "MON", "Dinner", id, null, null, null, null, recipes[i].getPortions()));
        }
        WeeklyPlan plan =
                new WeeklyPlan("user-1", "2024-12-09", entries, List.of("Dinner"), Instant.now(), Instant.now());
        return generator.mergePlan(existing, plan, byId, names);
    }

    private List<ShoppingListItem> generate(Recipe... recipes) {
        return generate(List.of(), Map.of(), recipes);
    }

    private static List<ShoppingListItem> named(List<ShoppingListItem> items, String name) {
        return items.stream().filter(i -> i.getName().equalsIgnoreCase(name)).toList();
    }

    @Test
    void eggsFromFiveRecipes_becomeOneLine() {
        List<ShoppingListItem> items = generate(
                recipe(4, new Ingredient("Ägg", 3.0, "st")),
                recipe(4, new Ingredient("ägg", 2.0, "st")),
                recipe(4, new Ingredient("Ägg", 4.0, "stycken")),
                recipe(4, new Ingredient(" Ägg ", 1.0, "st.")),
                recipe(4, new Ingredient("ÄGG", 5.0, "st")));

        assertThat(items, hasSize(1));
        assertThat(items.get(0).getName(), is("Ägg"));
        assertThat(items.get(0).getQuantity(), is(15.0));
        assertThat(items.get(0).getUnit(), is("st"));
    }

    @Test
    void volumesAddUpAcrossUnits_andShowInTheLargestSensibleUnit() {
        List<ShoppingListItem> items =
                generate(recipe(4, new Ingredient("Mjölk", 2.0, "dl")), recipe(4, new Ingredient("Mjölk", 0.5, "l")));
        assertThat(items, hasSize(1));
        assertThat(items.get(0).getQuantity(), is(7.0));
        assertThat(items.get(0).getUnit(), is("dl"));

        List<ShoppingListItem> oil =
                generate(recipe(4, new Ingredient("Olja", 1.0, "tsk")), recipe(4, new Ingredient("Olja", 1.0, "msk")));
        assertThat(oil.get(0).getQuantity(), is(1.3));
        assertThat(oil.get(0).getUnit(), is("msk"));

        List<ShoppingListItem> flour = generate(
                recipe(4, new Ingredient("Vetemjöl", 600.0, "g")), recipe(4, new Ingredient("Vetemjöl", 0.5, "kg")));
        assertThat(flour.get(0).getQuantity(), is(1.1));
        assertThat(flour.get(0).getUnit(), is("kg"));
    }

    @Test
    void sameUnitKeepsItsSpelling_evenWhenItCouldBeConverted() {
        List<ShoppingListItem> items =
                generate(recipe(4, new Ingredient("Olja", 2.0, "msk")), recipe(4, new Ingredient("Olja", 1.0, "msk")));
        assertThat(items.get(0).getQuantity(), is(3.0));
        assertThat(items.get(0).getUnit(), is("msk"));
    }

    @Test
    void differentUnitFamilies_stayOnSeparateLines() {
        // Volume can't become weight without knowing the flour's density.
        List<ShoppingListItem> items = generate(
                recipe(4, new Ingredient("Vetemjöl", 2.0, "dl")), recipe(4, new Ingredient("Vetemjöl", 200.0, "g")));
        assertThat(named(items, "Vetemjöl"), hasSize(2));
    }

    @Test
    void metricAndUsMeasures_stayApart() {
        List<ShoppingListItem> items =
                generate(recipe(4, new Ingredient("Mjölk", 2.0, "dl")), recipe(4, new Ingredient("Mjölk", 1.0, "cup")));
        assertThat(named(items, "Mjölk"), hasSize(2));
    }

    @Test
    void scaledCountsRoundUpToWholeUnits_andMeasuresRoundToOneDecimal() {
        // A recipe for 3 cooked for 4: 2 eggs → 2.67, which you can only buy as 3.
        Recipe forThree = recipe(3, new Ingredient("Ägg", 2.0, "st"), new Ingredient("Grädde", 1.0, "dl"));
        WeeklyPlan plan = new WeeklyPlan(
                "user-1",
                "2024-12-09",
                List.of(new PlanEntry("e", "MON", "Dinner", "r", null, null, null, null, 4)),
                List.of("Dinner"),
                Instant.now(),
                Instant.now());

        List<ShoppingListItem> items = generator.mergePlan(List.of(), plan, Map.of("r", forThree), Map.of());

        assertThat(named(items, "Ägg").get(0).getQuantity(), is(3.0));
        assertThat(named(items, "Grädde").get(0).getQuantity(), is(1.3));
    }

    @Test
    void ingredientsWithoutAmount_appearOnce_andDisappearNextToAnAmount() {
        List<ShoppingListItem> items = generate(
                recipe(4, new Ingredient("Salt", null, null)),
                recipe(4, new Ingredient("salt", null, null)),
                recipe(4, new Ingredient("Salt", null, null)),
                recipe(4, new Ingredient("Peppar", null, null), new Ingredient("Peppar", 1.0, "tsk")));

        assertThat(named(items, "Salt"), hasSize(1));
        assertThat(named(items, "Salt").get(0).getQuantity(), nullValue());
        // "Peppar" without an amount turns into the line that got one.
        assertThat(named(items, "Peppar"), hasSize(1));
        assertThat(named(items, "Peppar").get(0).getQuantity(), is(1.0));
    }

    @Test
    void normalizedNames_mergeVariantsOfOneProduct_butKeepDifferentProductsApart() {
        Map<String, NormalizedItemName> names = Map.of(
                "ägg, uppvispade", new NormalizedItemName("Ägg", ShoppingItemCategory.DAIRY),
                "Ägg", new NormalizedItemName("Ägg", ShoppingItemCategory.DAIRY),
                "tomat", new NormalizedItemName("Tomater", ShoppingItemCategory.PRODUCE),
                "Tomater", new NormalizedItemName("Tomater", ShoppingItemCategory.PRODUCE),
                "Rödlök", new NormalizedItemName("Rödlök", ShoppingItemCategory.PRODUCE),
                "Gul lök", new NormalizedItemName("Gul lök", ShoppingItemCategory.PRODUCE));

        List<ShoppingListItem> items = generate(
                List.of(),
                names,
                recipe(
                        4,
                        new Ingredient("ägg, uppvispade", 2.0, "st"),
                        new Ingredient("tomat", 1.0, "st"),
                        new Ingredient("Rödlök", 1.0, "st")),
                recipe(
                        4,
                        new Ingredient("Ägg", 3.0, "st"),
                        new Ingredient("Tomater", 3.0, "st"),
                        new Ingredient("Gul lök", 2.0, "st")));

        assertThat(named(items, "Ägg").get(0).getQuantity(), is(5.0));
        assertThat(named(items, "Tomater").get(0).getQuantity(), is(4.0));
        assertThat(named(items, "Rödlök"), hasSize(1));
        assertThat(named(items, "Gul lök"), hasSize(1));
        assertThat(items, hasSize(4));
        // The aisle comes along from the same lookup.
        assertThat(named(items, "Tomater").get(0).getCategory(), is(ShoppingItemCategory.PRODUCE));
    }

    @Test
    void theUsersOwnList_isRespected() {
        ShoppingListItem boughtMilk = new ShoppingListItem("bought", "Mjölk", 5.0, "dl", true);
        ShoppingListItem ownEggs = new ShoppingListItem("own", "ägg", null, null, false);
        ShoppingListItem ownTomatoes = new ShoppingListItem("tom", "tomater", 2.0, "st", false);
        Map<String, NormalizedItemName> names = Map.of(
                "tomater", new NormalizedItemName("Tomater", ShoppingItemCategory.PRODUCE),
                "tomat", new NormalizedItemName("Tomater", ShoppingItemCategory.PRODUCE));

        List<ShoppingListItem> items = generate(
                List.of(boughtMilk, ownEggs, ownTomatoes),
                names,
                recipe(
                        4,
                        new Ingredient("Mjölk", 3.0, "dl"),
                        new Ingredient("Ägg", 2.0, "st"),
                        new Ingredient("tomat", 1.0, "st")));

        // Already-bought milk is left alone; the new need gets its own line.
        assertThat(boughtMilk.getQuantity(), is(5.0));
        assertThat(boughtMilk.isChecked(), is(true));
        assertThat(named(items, "Mjölk"), hasSize(2));
        // The user's own lines take the amounts and keep their spelling.
        assertThat(ownEggs.getQuantity(), is(2.0));
        assertThat(ownEggs.getName(), is("ägg"));
        assertThat(ownTomatoes.getQuantity(), is(3.0));
        assertThat(ownTomatoes.getName(), is("tomater"));
        assertThat(items, hasSize(4));
    }

    @Test
    void untouchedExistingLines_keepTheirExactAmounts() {
        ShoppingListItem odd = new ShoppingListItem("odd", "Kaffe", 2.3333, "paket", false);
        List<ShoppingListItem> items = generate(List.of(odd), Map.of(), recipe(4, new Ingredient("Ris", 2.0, "dl")));
        assertThat(odd.getQuantity(), is(2.3333));
        assertThat(items, hasSize(2));
    }

    @Test
    void packageUnits_mergeWithTheirPlural() {
        List<ShoppingListItem> items = generate(
                recipe(4, new Ingredient("Krossade tomater", 1.0, "burk")),
                recipe(4, new Ingredient("Krossade tomater", 2.0, "burkar")));
        assertThat(items, hasSize(1));
        assertThat(items.get(0).getQuantity(), is(3.0));
        assertThat(items.get(0).getUnit(), is("burk"));
    }

    @Test
    void collectNames_includesPlanAndUncheckedExistingLines_once() {
        ShoppingListItem bought = new ShoppingListItem("b", "Kaffe", 1.0, "paket", true);
        ShoppingListItem own = new ShoppingListItem("o", "Tomater", null, null, false);
        Recipe r = recipe(4, new Ingredient("Ägg", 2.0, "st"), new Ingredient("Ägg", 1.0, "st"));
        WeeklyPlan plan = new WeeklyPlan(
                "user-1",
                "2024-12-09",
                List.of(new PlanEntry("e", "MON", "Dinner", "r", null, List.of("Bröd"), null, null, 4)),
                List.of("Dinner"),
                Instant.now(),
                Instant.now());

        List<String> names = generator.collectNames(List.of(bought, own), plan, Map.of("r", r));
        assertThat(names, contains("Tomater", "Bröd", "Ägg"));
    }

    private ShoppingListItem findItem(List<ShoppingListItem> items, String name, String unit) {
        return items.stream()
                .filter(item -> item.getName().equals(name)
                        && ((unit == null && item.getUnit() == null) || unit.equals(item.getUnit())))
                .findFirst()
                .orElseThrow();
    }
}
