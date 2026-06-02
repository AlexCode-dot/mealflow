package com.mealflow.identity.admin.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import java.util.Map;

/** All fields optional. Mirrors {@code UpdateUserBody}. */
public record UpdateUserRequest(
        @Email @Size(max = 254) String email,
        @Size(max = 128) String displayName,
        Map<String, Object> metadata) {}
