package com.mealflow.identity.admin.service;

import com.mealflow.identity.admin.web.dto.AdminUserDto;
import com.mealflow.identity.admin.web.dto.DeletionPlanResponse;
import com.mealflow.identity.admin.web.dto.ListUsersResponse;
import com.mealflow.identity.admin.web.dto.UpdateUserRequest;
import com.mealflow.identity.admin.web.dto.UserDetailResponse;
import com.mealflow.identity.audit.domain.AuditEventType;
import com.mealflow.identity.audit.service.AuditService;
import com.mealflow.identity.token.repository.RefreshTokenRepository;
import com.mealflow.identity.user.domain.User;
import com.mealflow.identity.user.repository.UserRepository;
import com.mealflow.identity.user.repository.UserRepositoryImpl;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * All admin-panel write paths against the user collection. Kept separate from
 * the end-user services so we can tightly control side effects — e.g. disabling
 * a user must also revoke their refresh tokens.
 *
 * <p>Every public method here is reachable only via {@code /api/admin/**}
 * routes, which are gated by {@code AdminTokenAuthFilter}.
 */
@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditService auditService;
    private final Clock clock;

    public AdminUserService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            AuditService auditService,
            Clock clock) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.auditService = auditService;
        this.clock = clock;
    }

    public ListUsersResponse list(String search, String status, String cursor, int limit) {
        // Repository returns limit+1 so we can compute hasMore without a count.
        List<User> page = userRepository.findAdminUsersPage(search, normalizeStatus(status), cursor, limit);

        boolean hasMore = page.size() > limit;
        List<User> trimmed = hasMore ? page.subList(0, limit) : page;

        List<AdminUserDto> dtos = new ArrayList<>(trimmed.size());
        for (User u : trimmed) dtos.add(AdminUserDto.from(u));

        String nextCursor = null;
        if (hasMore) {
            User last = trimmed.get(trimmed.size() - 1);
            nextCursor = UserRepositoryImpl.encodeCursor(last.getCreatedAt(), last.getId());
        }
        // total intentionally omitted — counting matched rows on every page would
        // be wasteful and isn't shown in the UI.
        return new ListUsersResponse(dtos, nextCursor, null);
    }

    public AdminUserDto get(String id) {
        return AdminUserDto.from(loadActive(id));
    }

    /**
     * Read-only "what does this user own + recent activity". For mealflow this
     * is essentially {@link AdminUserDto} reshaped — we don't have households,
     * an audit log, or feature flags yet — but the page expects the full
     * envelope or it crashes on shape access.
     */
    public UserDetailResponse detail(String id) {
        return UserDetailResponse.from(loadActive(id));
    }

    /**
     * "What would breaking this delete?" preview. mealflow has no
     * cross-user ownership graph (no households, no shared resources), so the
     * answer is always "nothing — safe to delete". Kept here so the admin
     * panel's delete dialog can render the same flow it does for sam-app
     * without branching on app type.
     */
    public DeletionPlanResponse deletionPlan(String id) {
        return DeletionPlanResponse.safeFrom(loadActive(id));
    }

    public AdminUserDto update(String id, UpdateUserRequest body) {
        User user = loadActive(id);
        Instant now = clock.instant();
        boolean changed = false;

        if (body.email() != null && !body.email().equalsIgnoreCase(user.getEmail())) {
            String normalized = body.email().trim().toLowerCase(Locale.ROOT);
            if (userRepository.findByEmail(normalized).isPresent()) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Email already in use");
            }
            user.setEmail(normalized);
            changed = true;
        }
        if (body.displayName() != null) {
            String trimmed =
                    body.displayName().isBlank() ? null : body.displayName().trim();
            user.setDisplayName(trimmed);
            changed = true;
        }
        // metadata is currently a no-op for mealflow — User has no metadata field.
        // We accept the field silently so the admin panel can send the same body
        // shape to every app without branching.

        if (changed) {
            user.setUpdatedAt(now);
            user = userRepository.save(user);
        }
        return AdminUserDto.from(user);
    }

    public AdminUserDto disable(String id) {
        User user = loadActive(id);
        if (!user.isDisabled()) {
            user.disable(clock.instant());
            user = userRepository.save(user);
            // Revoke refresh tokens so an in-flight session can't be renewed.
            // The current access token will still work until it expires (≤15 min),
            // which is acceptable for an admin disable.
            refreshTokenRepository.deleteByUserId(user.getId());
        }
        return AdminUserDto.from(user);
    }

    public AdminUserDto enable(String id) {
        User user = loadActive(id);
        if (user.isDisabled()) {
            user.enable(clock.instant());
            user = userRepository.save(user);
        }
        return AdminUserDto.from(user);
    }

    public void softDelete(String id) {
        User user = loadActive(id);
        user.softDelete(clock.instant());
        userRepository.save(user);
        // Revoking tokens here is critical — a soft-deleted account must not be
        // able to renew a session.
        refreshTokenRepository.deleteByUserId(user.getId());
        // Admin-initiated deletes go in the same audit channel as
        // self-deletes, marked with initiator="admin" so the panel can show
        // who pulled the trigger.
        auditService.log(
                AuditEventType.ACCOUNT_DELETED,
                AuditEventType.OUTCOME_SUCCESS,
                user.getId(),
                "user",
                user.getId(),
                null,
                java.util.Map.of("initiator", "admin"));
    }

    public void forceVerifyEmail(String id) {
        User user = loadActive(id);
        if (!user.isEmailVerified()) {
            user.forceEmailVerified(clock.instant());
            userRepository.save(user);
        }
    }

    public Map<String, Object> exportUser(String id) {
        User user = loadActive(id);
        // Plain map so we don't accidentally leak the password hash through DTO
        // reflection. Mirrors GDPR-style "give me everything you have on me",
        // but admin-initiated.
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", user.getId());
        out.put("email", user.getEmail());
        out.put("displayName", user.getDisplayName());
        out.put("emailVerified", user.isEmailVerified());
        out.put("emailVerifiedAt", user.getEmailVerifiedAt());
        out.put("disabledAt", user.getDisabledAt());
        out.put("createdAt", user.getCreatedAt());
        out.put("updatedAt", user.getUpdatedAt());
        out.put("exportedAt", clock.instant());
        return out;
    }

    private User loadActive(String id) {
        return userRepository
                .findActiveById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
    }

    private static String normalizeStatus(String status) {
        if (status == null) return null;
        return switch (status) {
            case "active", "disabled", "invited" -> status;
            default -> null; // unknown filter → ignore rather than 400
        };
    }
}
