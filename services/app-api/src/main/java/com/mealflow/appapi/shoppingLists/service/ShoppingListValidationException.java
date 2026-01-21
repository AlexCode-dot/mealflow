package com.mealflow.appapi.shoppingLists.service;

public class ShoppingListValidationException extends RuntimeException {
    public ShoppingListValidationException(String message) {
        super(message);
    }
}
