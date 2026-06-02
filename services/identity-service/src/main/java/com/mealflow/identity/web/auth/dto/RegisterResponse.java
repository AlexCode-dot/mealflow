package com.mealflow.identity.web.auth.dto;

/**
 * Returned from POST /auth/register. Does NOT contain auth tokens — the user must verify their
 * email via /auth/verify-email first. The email is echoed back so the client knows where to send
 * the user (verify screen pre-fills it from this response).
 */
public record RegisterResponse(String email, boolean verificationRequired) {}
