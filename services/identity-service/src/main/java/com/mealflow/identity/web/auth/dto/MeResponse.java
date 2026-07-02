package com.mealflow.identity.web.auth.dto;

/** Current authenticated user, returned from GET /auth/me. */
public record MeResponse(String userId, String email) {}
