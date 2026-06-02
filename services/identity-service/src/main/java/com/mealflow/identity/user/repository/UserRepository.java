package com.mealflow.identity.user.repository;

import com.mealflow.identity.user.domain.User;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String>, UserRepositoryCustom {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /** Used by admin metrics. Counts users created strictly after the supplied instant. */
    long countByCreatedAtAfter(Instant after);

    /** Total users excluding soft-deleted rows. Used by admin stats so the count matches the UI. */
    long countByDeletedAtIsNull();
}
