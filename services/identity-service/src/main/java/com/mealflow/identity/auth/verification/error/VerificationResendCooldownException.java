package com.mealflow.identity.auth.verification.error;

public class VerificationResendCooldownException extends RuntimeException {

    private final long retryAfterSeconds;

    public VerificationResendCooldownException(long retryAfterSeconds) {
        super("Please wait before requesting a new code");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
