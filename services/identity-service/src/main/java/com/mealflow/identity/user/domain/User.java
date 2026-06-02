package com.mealflow.identity.user.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String passwordHash;

    /**
     * Optional human-readable name. Set by the user from in-app profile settings or by an
     * admin operator from the admin panel. Nullable; UI falls back to the email local-part.
     */
    private String displayName;

    /**
     * Whether the user has clicked the verification code we sent to their email.
     * Nullable for backwards compatibility: any pre-existing account before this field was
     * introduced is treated as verified. New registrations always set this to false.
     */
    private Boolean emailVerified;

    private Instant emailVerifiedAt;

    /**
     * When set, the account is "disabled": login attempts are rejected and existing
     * refresh tokens are revoked on next presentation. Set by admin operators from the
     * admin panel. Cleared when the operator re-enables the account.
     */
    private Instant disabledAt;

    /**
     * Soft-delete tombstone. When set, the account is treated as gone from the user's
     * perspective: it disappears from listings, login is blocked, and a hard purge is
     * scheduled. The row stays around briefly so we can recover from accidental deletes
     * and so audit-log references stay resolvable.
     */
    private Instant deletedAt;

    private Instant createdAt;

    private Instant updatedAt;

    protected User() {}

    public User(String email, String passwordHash, Instant createdAt, Instant updatedAt) {
        this(email, passwordHash, false, null, createdAt, updatedAt);
    }

    public User(
            String email,
            String passwordHash,
            Boolean emailVerified,
            Instant emailVerifiedAt,
            Instant createdAt,
            Instant updatedAt) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.emailVerified = emailVerified;
        this.emailVerifiedAt = emailVerifiedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    /** Legacy users (created before this field existed) read back null — treat them as verified. */
    public boolean isEmailVerified() {
        return emailVerified == null || emailVerified;
    }

    public Instant getEmailVerifiedAt() {
        return emailVerifiedAt;
    }

    public void markEmailVerified(Instant now) {
        this.emailVerified = true;
        this.emailVerifiedAt = now;
        this.updatedAt = now;
    }

    /** Admin-only: force-verify an already-existing account. */
    public void forceEmailVerified(Instant now) {
        markEmailVerified(now);
    }

    public Instant getDisabledAt() {
        return disabledAt;
    }

    public boolean isDisabled() {
        return disabledAt != null;
    }

    public void disable(Instant now) {
        this.disabledAt = now;
        this.updatedAt = now;
    }

    public void enable(Instant now) {
        this.disabledAt = null;
        this.updatedAt = now;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public void softDelete(Instant now) {
        this.deletedAt = now;
        this.updatedAt = now;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
