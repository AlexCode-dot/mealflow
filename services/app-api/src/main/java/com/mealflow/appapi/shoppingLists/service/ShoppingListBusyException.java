package com.mealflow.appapi.shoppingLists.service;

/** Another request is changing which of the user's lists is active and did not finish in time (409). */
public class ShoppingListBusyException extends RuntimeException {
    public ShoppingListBusyException(String message) {
        super(message);
    }
}
