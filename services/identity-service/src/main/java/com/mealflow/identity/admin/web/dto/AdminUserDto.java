package com.mealflow.identity.admin.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.mealflow.identity.user.domain.User;
import java.time.Instant;
import java.util.Map;

/**
 * Wire shape for a user record returned to the admin panel.
 *
 * <p>Matches the {@code AdminUser} zod schema in
 * {@code @admin/contract/users}. Any drift here is a real bug — keep the
 * shapes mirrored.
 */
@JsonInclude(JsonInclude.Include.NON_ABSENT)
public record AdminUserDto(
        String id,
        String email,
        String displayName,
        String status,
        Instant createdAt,
        Instant lastLoginAt,
        Map<String, Object> metadata) {

    public static AdminUserDto from(User user) {
        // mealflow doesn't track "last login" yet — keep it null so the panel
        // renders "—" rather than a misleading value. The admin contract allows
        // null here.
        return new AdminUserDto(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                statusOf(user),
                user.getCreatedAt(),
                null,
                Map.of("emailVerified", user.isEmailVerified()));
    }

    private static String statusOf(User user) {
        // mealflow has no "invited" state — every user self-registers via /auth/register.
        if (user.isDisabled()) return "disabled";
        return "active";
    }
}
