package com.mealflow.appapi.shoppingLists.service;

import com.mealflow.appapi.shoppingLists.domain.ShoppingItemCategory;

/**
 * What an ingredient name means as something to buy: "finhackad gul lök" and "Gul lök" both become
 * "Gul lök", so they land on one line. The aisle comes along from the same lookup.
 */
public record NormalizedItemName(String name, ShoppingItemCategory category) {}
