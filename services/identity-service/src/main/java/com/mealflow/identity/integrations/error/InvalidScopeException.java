package com.mealflow.identity.integrations.error;

public class InvalidScopeException extends RuntimeException {
    public InvalidScopeException(String message) {
        super(message);
    }
}
