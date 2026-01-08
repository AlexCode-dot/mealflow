package com.mealflow.appapi.recipes.service;

public class RecipeValidationException extends RuntimeException {
    public RecipeValidationException(String message) {
        super(message);
    }
}
