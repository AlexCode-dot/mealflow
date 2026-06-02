package com.mealflow.identity.user.repository;

import com.mealflow.identity.user.domain.User;
import java.util.List;
import java.util.Optional;

/**
 * Admin-only queries that don't fit the spring-data derived-method patterns
 * cleanly. Implementations should leave non-admin code paths untouched.
 */
public interface UserRepositoryCustom {

    /**
     * Cursor-paginated admin user search. Returns up to {@code limit + 1} rows so
     * the caller can derive {@code hasMore} without a separate count.
     *
     * @param search  optional case-insensitive substring matched against email
     * @param status  one of "active" | "disabled" | null (any)
     * @param cursor  opaque cursor from the previous page (createdAt + id), or null for first page
     * @param limit   page size (1..100)
     */
    List<User> findAdminUsersPage(String search, String status, String cursor, int limit);

    /** Look up a single non-deleted user. */
    Optional<User> findActiveById(String id);
}
