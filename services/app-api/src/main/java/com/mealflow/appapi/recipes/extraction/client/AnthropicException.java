package com.mealflow.appapi.recipes.extraction.client;

public class AnthropicException extends RuntimeException {

    public AnthropicException(String message) {
        super(message);
    }

    public AnthropicException(String message, Throwable cause) {
        super(message, cause);
    }
}
