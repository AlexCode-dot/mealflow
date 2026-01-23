package com.mealflow.appapi.profile.web.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 80) String displayName,
        @Size(max = 50) String theme,

        @Size(max = 300) @Pattern(regexp = "^(https?://.+)?$", message = "avatarUrl must be a valid http(s) URL")
        String avatarUrl) {}
