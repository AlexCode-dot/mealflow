package com.mealflow.identity.auth.verification;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A pending email verification for a user. We store only a hash of the 6-digit code, never the
 * raw value. The document also tracks attempts and consumption so it can be invalidated after
 * the right number of guesses or after the user uses it.
 */
@Document(collection = "email_verifications")
public class EmailVerification {

    @Id
    private String id;

    @Indexed
    private String userId;

    /** Normalized email at the time of issuing — convenient for /resend-verification lookups. */
    @Indexed
    private String email;

    private String codeHash;

    private Instant expiresAt;

    private int attempts;

    private boolean consumed;

    private Instant createdAt;

    private Instant updatedAt;

    protected EmailVerification() {}

    public EmailVerification(String userId, String email, String codeHash, Instant expiresAt, Instant now) {
        this.userId = userId;
        this.email = email;
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
        this.attempts = 0;
        this.consumed = false;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public String getCodeHash() {
        return codeHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public int getAttempts() {
        return attempts;
    }

    public boolean isConsumed() {
        return consumed;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void incrementAttempts(Instant now) {
        this.attempts += 1;
        this.updatedAt = now;
    }

    public void markConsumed(Instant now) {
        this.consumed = true;
        this.updatedAt = now;
    }
}
