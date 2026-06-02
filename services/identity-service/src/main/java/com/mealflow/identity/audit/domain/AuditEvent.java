package com.mealflow.identity.audit.domain;

import java.time.Instant;
import java.util.Map;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Persisted record of a security-relevant event.
 *
 * <p>This is the same idea as sam-app's {@code audit_events} table:
 * append-only, written best-effort from the business path, queried by the
 * admin panel's monitoring page to surface login spikes, token-reuse
 * attempts, and other anomalies.
 *
 * <p><b>Why a separate collection (not just logs)</b>: structured queries
 * (counts by event-type bucketed per hour) are what powers the admin
 * monitoring graph. Grepping logs would force a JSON parse per request.
 *
 * <h3>Privacy &amp; size</h3>
 * Stores hashed-thin context only: actor user id, IP, UA snippet. No
 * email body, no password material, no token plaintext. {@code metadata}
 * may carry a small JSON blob for event-specific context (e.g.
 * {@code {"reason":"INVALID_CREDENTIALS"}} on a failed login) — never PII.
 *
 * <h3>Indexes</h3>
 * Two indexes the admin queries lean on:
 * <ul>
 *   <li>{@code eventType + createdAt} — bucket-aggregation by event type.
 *   <li>{@code actorUserId + createdAt} — "recent activity for this user"
 *       in the user-detail panel.
 * </ul>
 */
@Document(collection = "audit_events")
public class AuditEvent {

    @Id
    private String id;

    /** Stable enum string — see {@link AuditEventType}. Indexed for bucket queries. */
    @Indexed
    private String eventType;

    /** "success" | "failure" — present on auth events, null on admin/security events. */
    private String outcome;

    /** Null if the actor is anonymous (e.g. failed login before identifying the user). */
    @Indexed
    private String actorUserId;

    /** Optional target — the user being acted upon, the household, etc. */
    private String targetKind;

    private String targetId;

    /** Caller IP. Null if we can't resolve it (e.g. background job). */
    private String ipAddress;

    /** Truncated User-Agent. Stored mainly so post-mortem queries can spot bot patterns. */
    private String userAgent;

    /** Small event-specific blob. NEVER PII. */
    private Map<String, Object> metadata;

    @Indexed
    private Instant createdAt;

    protected AuditEvent() {}

    public AuditEvent(
            String eventType,
            String outcome,
            String actorUserId,
            String targetKind,
            String targetId,
            String ipAddress,
            String userAgent,
            Map<String, Object> metadata,
            Instant createdAt) {
        this.eventType = eventType;
        this.outcome = outcome;
        this.actorUserId = actorUserId;
        this.targetKind = targetKind;
        this.targetId = targetId;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.metadata = metadata;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public String getEventType() {
        return eventType;
    }

    public String getOutcome() {
        return outcome;
    }

    public String getActorUserId() {
        return actorUserId;
    }

    public String getTargetKind() {
        return targetKind;
    }

    public String getTargetId() {
        return targetId;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
