package com.mealflow.appapi.shoppingLists.service;

import com.mealflow.appapi.shoppingLists.domain.ShoppingItemCategory;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListItem;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Decides which aisle each item belongs to: the keyword lookup answers instantly for the common
 * cases, and whatever it doesn't recognise is sent to the LLM in a single batched call.
 */
@Service
public class ItemCategoryResolver {

    private final ShoppingItemCategorizer keywordCategorizer;
    private final LlmItemCategorizer llmCategorizer;

    public ItemCategoryResolver(ShoppingItemCategorizer keywordCategorizer, LlmItemCategorizer llmCategorizer) {
        this.keywordCategorizer = keywordCategorizer;
        this.llmCategorizer = llmCategorizer;
    }

    /**
     * Keyword-only lookup, for a single item added by hand. No network call — the item has to land
     * in a section the moment the user hits save.
     */
    public ShoppingItemCategory resolveFromKeywords(String name) {
        return keywordCategorizer.categorize(name).orElse(ShoppingItemCategory.OTHER);
    }

    /**
     * Fills in the category of every item that doesn't have one yet: keywords first, then one LLM
     * call for the leftovers. Items still unresolved after that become OTHER.
     */
    public void applyCategories(List<ShoppingListItem> items) {
        if (items == null || items.isEmpty()) {
            return;
        }

        Set<String> unresolved = new LinkedHashSet<>();
        for (ShoppingListItem item : items) {
            if (item.getCategory() != ShoppingItemCategory.OTHER) {
                continue; // already categorized (e.g. carried over from a previous list)
            }
            ShoppingItemCategory fromKeywords =
                    keywordCategorizer.categorize(item.getName()).orElse(null);
            if (fromKeywords != null) {
                item.setCategory(fromKeywords);
            } else if (item.getName() != null && !item.getName().isBlank()) {
                unresolved.add(item.getName());
            }
        }

        if (unresolved.isEmpty()) {
            return;
        }

        Map<String, ShoppingItemCategory> fromLlm = llmCategorizer.categorize(List.copyOf(unresolved));
        if (fromLlm.isEmpty()) {
            return;
        }
        for (ShoppingListItem item : items) {
            if (item.getCategory() == ShoppingItemCategory.OTHER) {
                ShoppingItemCategory resolved = fromLlm.get(item.getName());
                if (resolved != null) {
                    item.setCategory(resolved);
                }
            }
        }
    }
}
