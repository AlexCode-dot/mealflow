package com.mealflow.identity.admin.web.dto;

import com.mealflow.identity.user.domain.User;
import java.util.List;

/**
 * Read-only "what would happen if I delete this user" preview. Used by
 * the admin panel to populate the delete-confirmation dialog.
 *
 * <p>Must match sam-app's {@code getDeletionPlan} shape — see
 * monitoring.tsx and users/index.tsx for the consumers.
 *
 * <p>For mealflow, deletion is never blocked (no households exist) and
 * there's nothing to cascade or leave. The flag/list fields stay empty
 * but well-formed so the UI renders cleanly.
 */
public record DeletionPlanResponse(
        UserBlock user,
        boolean blocked,
        List<Object> blockedByOwnership,
        List<Object> cascadeHouseholds,
        List<Object> leaveHouseholds) {

    public record UserBlock(String id, String email, String displayName) {
        public static UserBlock from(User u) {
            return new UserBlock(u.getId(), u.getEmail(), u.getDisplayName());
        }
    }

    public static DeletionPlanResponse safeFrom(User u) {
        return new DeletionPlanResponse(UserBlock.from(u), false, List.of(), List.of(), List.of());
    }
}
