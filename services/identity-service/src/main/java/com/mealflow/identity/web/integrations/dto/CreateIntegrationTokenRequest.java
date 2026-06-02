package com.mealflow.identity.web.integrations.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateIntegrationTokenRequest(
        @NotBlank @Size(max = 80) String name,
        List<String> scopes,
        @Min(1) @Max(3650) Integer expiresInDays) {}
