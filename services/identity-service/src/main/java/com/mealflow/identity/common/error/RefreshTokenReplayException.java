package com.mealflow.identity.common.error;

public class RefreshTokenReplayException extends RuntimeException {
    public RefreshTokenReplayException(String message) {
        super(message);
    }
}
