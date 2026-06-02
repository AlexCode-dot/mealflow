package com.mealflow.identity.integrations.error;

public class IntegrationTokenNotFoundException extends RuntimeException {
    public IntegrationTokenNotFoundException(String message) {
        super(message);
    }
}
