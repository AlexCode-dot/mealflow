package com.mealflow.identity.auth.verification;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface EmailVerificationRepository extends MongoRepository<EmailVerification, String> {

    /** The latest unconsumed verification for a given email. There is at most one in practice. */
    Optional<EmailVerification> findFirstByEmailAndConsumedFalseOrderByCreatedAtDesc(String email);

    /** Used during register to invalidate any previous unconsumed records for the same email. */
    long deleteByEmailAndConsumedFalse(String email);
}
