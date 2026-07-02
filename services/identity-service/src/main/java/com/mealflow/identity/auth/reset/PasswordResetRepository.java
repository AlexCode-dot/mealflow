package com.mealflow.identity.auth.reset;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PasswordResetRepository extends MongoRepository<PasswordReset, String> {

    /** The latest unconsumed reset for a given email. There is at most one in practice. */
    Optional<PasswordReset> findFirstByEmailAndConsumedFalseOrderByCreatedAtDesc(String email);

    /** Invalidate any previous unconsumed reset records for the same email before issuing a new one. */
    long deleteByEmailAndConsumedFalse(String email);
}
