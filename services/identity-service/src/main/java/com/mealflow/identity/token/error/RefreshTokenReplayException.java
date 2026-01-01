package com.mealflow.identity.token.error;

public class RefreshTokenReplayException extends RuntimeException {
    public RefreshTokenReplayException(String message) {
        super(message);
    }
}
