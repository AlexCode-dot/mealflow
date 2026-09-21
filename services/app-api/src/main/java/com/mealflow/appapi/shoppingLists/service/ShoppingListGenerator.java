package com.mealflow.appapi.shoppingLists.service;

import com.mealflow.appapi.recipes.domain.Ingredient;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.shoppingLists.domain.ShoppingItemCategory;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListItem;
import com.mealflow.appapi.weeklyPlans.domain.PlanEntry;
import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Builds a shopping list from a weekly plan, merging everything that is the same product into one
 * line so the list stays short:
 *
 * <ul>
 *   <li>Names match after normalization (see {@link LlmItemNameNormalizer}) — "ägg, uppvispade" and
 *       "Ägg" are one product — and otherwise case- and whitespace-insensitively.
 *   <li>Amounts add up across units of the same family: 2 dl + 0.5 l is 7 dl, "st" and "stycken"
 *       are the same unit. Different families (1 dl vs 100 g flour) stay separate lines.
 *   <li>An ingredient with no amount ("salt") appears once, and not at all if another recipe
 *       already puts an amount of it on the list.
 * </ul>
 *
 * <p>The user's own list is respected: checked items are never merged into (they're already
 * bought), existing lines keep their names, and existing lines are never merged with each other.
 */
@Component
public class ShoppingListGenerator {

    public List<ShoppingListItem> mergePlan(
            List<ShoppingListItem> existingItems, WeeklyPlan plan, Map<String, Recipe> recipesById) {
        return mergePlan(existingItems, plan, recipesById, Map.of());
    }

    public List<ShoppingListItem> mergePlan(
            List<ShoppingListItem> existingItems,
            WeeklyPlan plan,
            Map<String, Recipe> recipesById,
            Map<String, NormalizedItemName> normalizedNames) {
        Merger merger = new Merger(normalizedNames == null ? Map.of() : normalizedNames);
        for (ShoppingListItem item : existingItems == null ? List.<ShoppingListItem>of() : existingItems) {
            merger.addExisting(item);
        }
        for (Incoming incoming : incomingItems(plan, recipesById)) {
            merger.addIncoming(incoming);
        }
        return merger.result();
    }

    /**
     * The raw names the merge will compare — every name the plan adds plus the unchecked lines
     * already on the list — so they can be normalized together in one call before merging.
     */
    public List<String> collectNames(
            List<ShoppingListItem> existingItems, WeeklyPlan plan, Map<String, Recipe> recipesById) {
        Set<String> names = new LinkedHashSet<>();
        for (ShoppingListItem item : existingItems == null ? List.<ShoppingListItem>of() : existingItems) {
            String name = normalizeName(item.getName());
            if (!item.isChecked() && !name.isBlank()) {
                names.add(name);
            }
        }
        for (Incoming incoming : incomingItems(plan, recipesById)) {
            names.add(incoming.name());
        }
        return List.copyOf(names);
    }

    /** One thing the plan wants on the list, before merging. */
    private record Incoming(String name, Double quantity, String unit) {}

    private List<Incoming> incomingItems(WeeklyPlan plan, Map<String, Recipe> recipesById) {
        List<Incoming> incoming = new ArrayList<>();
        List<PlanEntry> entries = plan.getEntries() == null ? List.of() : plan.getEntries();
        for (PlanEntry entry : entries) {
            boolean hasItemInEntry = addPlanItems(incoming, entry.getItems());
            boolean hasExtraItemInEntry = addPlanItems(incoming, entry.getExtraItems());

            if (!hasItemInEntry && !hasExtraItemInEntry) {
                addCustomTitleFallback(incoming, entry);
            }

            if (entry.getRecipeId() == null || entry.getRecipeId().isBlank()) {
                continue;
            }

            Recipe recipe = recipesById.get(entry.getRecipeId());
            if (recipe == null) {
                throw new ShoppingListValidationException("Weekly plan references recipes not found");
            }

            for (Ingredient ingredient : recipe.getIngredients()) {
                String name = normalizeName(ingredient.getName());
                if (name.isBlank()) {
                    continue;
                }
                Double quantity = scaleQuantity(ingredient.getQuantity(), recipe.getPortions(), entry.getPortions());
                incoming.add(new Incoming(name, quantity, normalizeUnit(ingredient.getUnit())));
            }
        }
        return incoming;
    }

    private boolean addPlanItems(List<Incoming> incoming, List<String> planItems) {
        if (planItems == null) {
            return false;
        }
        boolean addedAny = false;
        for (String name : planItems) {
            String normalized = normalizeName(name);
            if (normalized.isBlank()) {
                continue;
            }
            incoming.add(new Incoming(normalized, null, null));
            addedAny = true;
        }
        return addedAny;
    }

    private void addCustomTitleFallback(List<Incoming> incoming, PlanEntry entry) {
        if (entry.getRecipeId() != null && !entry.getRecipeId().isBlank()) {
            return;
        }
        String normalizedTitle = normalizeName(entry.getCustomTitle());
        if (normalizedTitle.isBlank()) {
            return;
        }
        incoming.add(new Incoming(normalizedTitle, null, null));
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

    private static String normalizeName(String name) {
        if (name == null) {
            return "";
        }
        return name.trim().replaceAll("\\s+", " ");
    }

    private static String normalizeUnit(String unit) {
        if (unit == null) {
            return null;
        }
        String trimmed = unit.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    /** A line on the list being built, and the running total behind it. */
    private static final class Row {
        final ShoppingListItem item;
        String familyKey;
        ShoppingUnits.Family family;
        ShoppingUnits.Unit firstUnit;
        String firstRawUnit;
        double baseAmount;
        final Set<String> canonicalUnits = new LinkedHashSet<>();
        /** Only lines the plan created or added to are recomputed and rounded. */
        boolean touched;

        Row(ShoppingListItem item) {
            this.item = item;
        }

        void startTotal(double quantity, String rawUnit) {
            ShoppingUnits.Unit unit = ShoppingUnits.parse(rawUnit);
            family = unit.family();
            familyKey = unit.familyKey();
            firstUnit = unit;
            firstRawUnit = rawUnit;
            baseAmount = quantity * unit.toBase();
            canonicalUnits.add(unit.canonical());
        }

        void add(double quantity, String rawUnit) {
            ShoppingUnits.Unit unit = ShoppingUnits.parse(rawUnit);
            baseAmount += quantity * unit.toBase();
            canonicalUnits.add(unit.canonical());
            touched = true;
        }

        void writeBack() {
            if (!touched || firstUnit == null) {
                return;
            }
            ShoppingUnits.Unit shown = firstUnit;
            String shownRaw = firstRawUnit;
            if (canonicalUnits.size() > 1) {
                ShoppingUnits.Unit ladder = ShoppingUnits.displayUnitFor(family, baseAmount);
                if (ladder != null) {
                    shown = ladder;
                    shownRaw = ladder.canonical();
                }
            }
            item.setQuantity(ShoppingUnits.round(baseAmount / shown.toBase(), shown));
            item.setUnit(shownRaw);
        }
    }

    private static final class Merger {
        private final Map<String, NormalizedItemName> normalizedNames;
        private final List<Row> rows = new ArrayList<>();
        /** Unchecked lines with an amount, by name + unit family — where incoming amounts add up. */
        private final Map<String, Row> quantified = new HashMap<>();
        /** Unchecked lines without an amount, by name — upgraded when an amount turns up. */
        private final Map<String, Row> unquantified = new HashMap<>();

        private final Set<String> namesWithAmount = new HashSet<>();

        Merger(Map<String, NormalizedItemName> normalizedNames) {
            this.normalizedNames = normalizedNames;
        }

        void addExisting(ShoppingListItem item) {
            Row row = new Row(item);
            rows.add(row);
            if (item.isChecked()) {
                return; // already bought; the plan's needs go on a fresh line
            }
            String nameKey = nameKey(item.getName());
            if (item.getQuantity() != null) {
                row.startTotal(item.getQuantity(), item.getUnit());
                // The user may have two lines of the same thing; leave that alone, merge into the first.
                quantified.putIfAbsent(nameKey + "|" + row.familyKey, row);
                namesWithAmount.add(nameKey);
            } else {
                unquantified.putIfAbsent(nameKey, row);
            }
        }

        void addIncoming(Incoming incoming) {
            NormalizedItemName normalized = normalizedNames.get(incoming.name());
            String displayName = normalized != null ? normalized.name() : incoming.name();
            ShoppingItemCategory category = normalized != null ? normalized.category() : null;
            String nameKey = key(displayName);

            if (incoming.quantity() == null) {
                // "Salt" with no amount says nothing a line of salt doesn't already say.
                if (namesWithAmount.contains(nameKey) || unquantified.containsKey(nameKey)) {
                    return;
                }
                Row row = new Row(newItem(displayName, category));
                rows.add(row);
                unquantified.put(nameKey, row);
                return;
            }

            String familyKey = ShoppingUnits.parse(incoming.unit()).familyKey();
            Row existing = quantified.get(nameKey + "|" + familyKey);
            if (existing != null) {
                existing.add(incoming.quantity(), incoming.unit());
                return;
            }

            // A line for this product already exists without an amount: give it this one.
            Row placeholder = unquantified.remove(nameKey);
            Row row = placeholder != null ? placeholder : new Row(newItem(displayName, category));
            if (placeholder == null) {
                rows.add(row);
            }
            row.startTotal(incoming.quantity(), incoming.unit());
            row.touched = true;
            quantified.put(nameKey + "|" + familyKey, row);
            namesWithAmount.add(nameKey);
        }

        List<ShoppingListItem> result() {
            List<ShoppingListItem> items = new ArrayList<>(rows.size());
            for (Row row : rows) {
                row.writeBack();
                items.add(row.item);
            }
            return items;
        }

        private String nameKey(String rawName) {
            String name = normalizeName(rawName);
            NormalizedItemName normalized = normalizedNames.get(name);
            return key(normalized != null ? normalized.name() : name);
        }

        private static String key(String name) {
            return normalizeName(name).toLowerCase(Locale.ROOT);
        }

        private static ShoppingListItem newItem(String name, ShoppingItemCategory category) {
            return new ShoppingListItem(UUID.randomUUID().toString(), name, null, null, false, category);
        }
    }
}
