package com.mealflow.appapi.shoppingLists.domain;

import java.util.Locale;

public enum ShoppingListStatus {
    ACTIVE("active"),
    ARCHIVED("archived");

    private final String value;

    ShoppingListStatus(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    public static ShoppingListStatus fromValue(String raw) {
        if (raw == null) {
            return null;
        }
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        for (ShoppingListStatus status : values()) {
            if (status.value.equals(normalized)) {
                return status;
            }
        }
        throw new IllegalArgumentException("status must be active or archived");
    }
}
