package com.mealflow.identity.audit.domain;

/**
 * Canonical set of event-type strings. Centralized so the admin panel and
 * any future analytics can rely on a closed enum.
 *
 * <p>Mirrors the relevant subset of sam-app's {@code AuditEventType} —
 * mealflow doesn't have households, children, Apple Sign-In, or admin-panel
 * audit (that lives in admin-all-apps' own log), so those entries are
 * omitted. Adding new types here should be a deliberate review step.
 */
public final class AuditEventType {

    private AuditEventType() {}

    // Auth
    public static final String REGISTER = "auth.register";
    public static final String LOGIN = "auth.login";
    public static final String LOGOUT = "auth.logout";
    public static final String PASSWORD_RESET_REQUESTED = "auth.password_reset_requested";
    public static final String PASSWORD_RESET_COMPLETED = "auth.password_reset_completed";
    public static final String EMAIL_VERIFIED = "auth.email_verified";
    public static final String EMAIL_VERIFICATION_RESENT = "auth.email_verification_resent";
    public static final String ACCOUNT_DELETED = "auth.account_deleted";

    // Security signals
    public static final String TOKEN_REUSE_DETECTED = "security.token_reuse_detected";

    // Outcome literals — kept as constants so callers don't typo "succes".
    public static final String OUTCOME_SUCCESS = "success";
    public static final String OUTCOME_FAILURE = "failure";
}
