package com.mealflow.identity.admin.web.dto;

import com.mealflow.identity.user.domain.User;
import java.time.Instant;
import java.util.List;

/**
 * Shape consumed by the admin panel's user-detail page. Must match
 * sam-app's {@code admin.service.getUserDetail} byte-for-byte: the client
 * accesses every field by name and would crash on missing/renamed keys
 * (we hit the equivalent bug on monitoring during integration).
 *
 * <p>mealflow has no households/audit-log/feature-flags, so the
 * collection fields are always empty. The compact user record stays
 * populated so the page renders correctly.
 */
public record UserDetailResponse(
        UserBlock user,
        List<Object> memberships,
        long eventCount,
        Instant lastActivityAt,
        List<Object> recentAudit,
        List<Object> featureFlagOverrides) {

    public record UserBlock(
            String id,
            String email,
            String displayName,
            Instant emailVerifiedAt,
            Instant disabledAt,
            Instant createdAt,
            Instant lastLoginAt) {

        public static UserBlock from(User u) {
            return new UserBlock(
                    u.getId(),
                    u.getEmail(),
                    u.getDisplayName(),
                    u.getEmailVerifiedAt(),
                    u.getDisabledAt(),
                    u.getCreatedAt(),
                    null);
        }
    }

    public static UserDetailResponse from(User u) {
        return new UserDetailResponse(UserBlock.from(u), List.of(), 0L, null, List.of(), List.of());
    }
}
