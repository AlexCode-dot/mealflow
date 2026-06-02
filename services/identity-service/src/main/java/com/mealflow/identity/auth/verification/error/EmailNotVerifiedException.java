package com.mealflow.identity.auth.verification.error;

public class EmailNotVerifiedException extends RuntimeException {

    private final String email;

    public EmailNotVerifiedException(String email) {
        super("Email not verified");
        this.email = email;
    }

    public String getEmail() {
        return email;
    }
}
