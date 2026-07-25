package com.mealflow.appapi.shoppingLists.domain;

import java.util.Locale;

/**
 * Grocery aisle a shopping-list item belongs to. Declaration order is the order the sections are
 * shown in the app — roughly how you walk a Swedish supermarket, with OTHER last.
 */
public enum ShoppingItemCategory {
    PRODUCE,
    MEAT,
    FISH,
    DAIRY,
    BREAD,
    PANTRY,
    FROZEN,
    DRINKS,
    OTHER;

    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** Lenient parse used for client input; unknown/blank values fall back to OTHER. */
    public static ShoppingItemCategory fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return OTHER;
        }
        try {
            return valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return OTHER;
        }
    }
}
