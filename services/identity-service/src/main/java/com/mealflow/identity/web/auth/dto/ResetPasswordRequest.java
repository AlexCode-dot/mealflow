package com.mealflow.identity.web.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @Email @NotBlank String email,

        @NotBlank @Pattern(regexp = "\\d{6}", message = "Code must be 6 digits")
        String code,

        @NotBlank @Size(min = 8, max = 72) String newPassword) {}
