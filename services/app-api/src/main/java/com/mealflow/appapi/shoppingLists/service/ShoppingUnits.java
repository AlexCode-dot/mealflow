package com.mealflow.appapi.shoppingLists.service;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Recognises the units recipes use, so amounts written differently can still be added up: "st",
 * "stycken" and "pcs" are one unit, and 2 dl + 0.5 l is one line of 7 dl.
 *
 * <p>Units only convert within a family. Metric and US measures are kept apart, so a Swedish
 * recipe and an imported American one don't produce "1.37 cups" on a Swedish list; and volume
 * never converts to weight, which would need the ingredient's density.
 */
final class ShoppingUnits {

    enum Family {
        METRIC_VOLUME,
        US_VOLUME,
        METRIC_MASS,
        US_MASS,
        COUNT,
        /** Package-style units (burk, paket, klyfta) and quantities with no unit: added only to themselves. */
        OTHER
    }

    /** A recognised unit: its canonical spelling, its family and how many base units one of it is. */
    record Unit(String canonical, Family family, double toBase) {

        /** Units that only merge with the exact same unit get their own key within OTHER. */
        String familyKey() {
            return family == Family.OTHER ? "other:" + canonical : family.name();
        }

        /** You can't buy 2.67 eggs or half a tin, so countable amounts round up to whole units. */
        boolean isCountable() {
            return family == Family.COUNT || family == Family.OTHER;
        }
    }

    private static final Map<String, Unit> KNOWN = new HashMap<>();

    /**
     * When one line combines different units of a family, the total is shown in the largest unit
     * that still gives at least 1 — 130 ml becomes 1.3 dl, 20 ml becomes 1.3 msk.
     */
    private static final Map<Family, List<String>> DISPLAY_LADDER = Map.of(
            Family.METRIC_VOLUME, List.of("l", "dl", "msk", "tsk", "krm"),
            Family.US_VOLUME, List.of("cup", "tbsp", "tsp"),
            Family.METRIC_MASS, List.of("kg", "g"),
            Family.US_MASS, List.of("lb", "oz"));

    private static final Map<String, String> OTHER_SINGULAR = Map.ofEntries(
            Map.entry("klyftor", "klyfta"),
            Map.entry("burkar", "burk"),
            Map.entry("förpackning", "förp"),
            Map.entry("förpackningar", "förp"),
            Map.entry("knippen", "knippe"),
            Map.entry("krukor", "kruka"),
            Map.entry("skivor", "skiva"),
            Map.entry("nypor", "nypa"),
            Map.entry("cloves", "clove"),
            Map.entry("cans", "can"),
            Map.entry("bunches", "bunch"),
            Map.entry("slices", "slice"),
            Map.entry("pinches", "pinch"),
            Map.entry("packages", "package"));

    static {
        register(Family.COUNT, 1, "st", "stk", "styck", "stycken", "pcs", "pc", "piece", "pieces");

        register(Family.METRIC_VOLUME, 1, "ml", "milliliter");
        register(Family.METRIC_VOLUME, 10, "cl", "centiliter");
        register(Family.METRIC_VOLUME, 100, "dl", "deciliter");
        register(Family.METRIC_VOLUME, 1000, "l", "liter", "litre", "liters", "litres");
        register(Family.METRIC_VOLUME, 1, "krm", "kryddmått");
        register(Family.METRIC_VOLUME, 5, "tsk", "tesked", "teskedar");
        register(Family.METRIC_VOLUME, 15, "msk", "matsked", "matskedar");

        register(Family.US_VOLUME, 4.92892, "tsp", "teaspoon", "teaspoons");
        register(Family.US_VOLUME, 14.7868, "tbsp", "tablespoon", "tablespoons");
        register(Family.US_VOLUME, 236.588, "cup", "cups");
        register(Family.US_VOLUME, 29.5735, "fl oz", "floz", "fluid ounce", "fluid ounces");

        register(Family.METRIC_MASS, 1, "g", "gr", "gram");
        register(Family.METRIC_MASS, 1000, "kg", "kilo", "kilogram");

        register(Family.US_MASS, 28.3495, "oz", "ounce", "ounces");
        register(Family.US_MASS, 453.592, "lb", "lbs", "pound", "pounds");
    }

    private ShoppingUnits() {}

    private static void register(Family family, double toBase, String canonical, String... aliases) {
        Unit unit = new Unit(canonical, family, toBase);
        KNOWN.put(canonical, unit);
        for (String alias : aliases) {
            KNOWN.put(alias, unit);
        }
    }

    /** Never null: an unknown or missing unit becomes its own OTHER unit. */
    static Unit parse(String raw) {
        String key = clean(raw);
        Unit known = KNOWN.get(key);
        if (known != null) {
            return known;
        }
        return new Unit(OTHER_SINGULAR.getOrDefault(key, key), Family.OTHER, 1);
    }

    /** The unit a combined total should be shown in; see {@link #DISPLAY_LADDER}. */
    static Unit displayUnitFor(Family family, double baseAmount) {
        List<String> ladder = DISPLAY_LADDER.get(family);
        if (ladder == null) {
            return null;
        }
        for (String candidate : ladder) {
            Unit unit = KNOWN.get(candidate);
            if (baseAmount / unit.toBase() >= 1 - 1e-9) {
                return unit;
            }
        }
        return KNOWN.get(ladder.get(ladder.size() - 1));
    }

    /**
     * Rounds a shopping amount to something a person would write down: whole units for countable
     * things (rounded up), whole numbers from 10 upwards, otherwise one decimal.
     */
    static double round(double value, Unit unit) {
        if (unit.isCountable()) {
            return Math.max(1, Math.ceil(value - 1e-6));
        }
        if (value >= 10) {
            return Math.round(value);
        }
        double oneDecimal = Math.round(value * 10) / 10.0;
        return oneDecimal > 0 ? oneDecimal : Math.round(value * 100) / 100.0;
    }

    private static String clean(String raw) {
        if (raw == null) {
            return "";
        }
        String lower = raw.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
        return lower.endsWith(".") ? lower.substring(0, lower.length() - 1) : lower;
    }
}
