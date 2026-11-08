package com.mealflow.appapi.integrations.v1.dto;

import java.time.Instant;
import java.util.List;

/**
 * The active list after a week's plan was added to it: exactly the fields of {@link
 * ShoppingListDto}, plus how many lines the plan {@code added} and how many existing lines it was
 * {@code merged} into.
 */
public record ShoppingListFromPlanDto(
        String id,
        String title,
        String status,
        List<ShoppingListItemDto> items,
        Instant updatedAt,
        Long version,
        int added,
        int merged) {

    public static ShoppingListFromPlanDto of(ShoppingListDto list, int added, int merged) {
        return new ShoppingListFromPlanDto(
                list.id(), list.title(), list.status(), list.items(), list.updatedAt(), list.version(), added, merged);
    }
}
