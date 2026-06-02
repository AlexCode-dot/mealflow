package com.mealflow.identity.audit.service;

import com.mealflow.identity.audit.domain.AuditEvent;
import com.mealflow.identity.audit.repository.AuditEventRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Best-effort audit writer.
 *
 * <p><b>Never throws.</b> If the insert fails we log to stderr and keep
 * going — losing one audit row must never break a real auth request. This
 * mirrors sam-app's {@code logAuditEvent} contract and is the standard
 * pattern: audit failure is an operational problem, not a user-facing one.
 *
 * <p>Synchronous on purpose. We considered {@code @Async} but the writes
 * are tiny single-document inserts and going async would expand the
 * blast radius (lost events on graceful shutdown, harder error tracing)
 * for negligible latency gain.
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditEventRepository repository;
    private final Clock clock;

    public AuditService(AuditEventRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    public void log(
            String eventType,
            String outcome,
            String actorUserId,
            String targetKind,
            String targetId,
            HttpServletRequest request,
            Map<String, Object> metadata) {
        try {
            String ip = ipOf(request);
            String ua = uaOf(request);
            AuditEvent event = new AuditEvent(
                    eventType,
                    outcome,
                    actorUserId,
                    targetKind,
                    targetId,
                    ip,
                    ua,
                    metadata == null ? Map.of() : metadata,
                    clock.instant());
            repository.save(event);
        } catch (RuntimeException e) {
            // Swallow — operational issue, must not fail the caller's path.
            log.error("audit: failed to write event eventType={} outcome={}", eventType, outcome, e);
        }
    }

    /** Convenience overload for events without an outcome flag. */
    public void log(
            String eventType,
            String actorUserId,
            String targetKind,
            String targetId,
            HttpServletRequest request,
            Map<String, Object> metadata) {
        log(eventType, null, actorUserId, targetKind, targetId, request, metadata);
    }

    private static String ipOf(HttpServletRequest request) {
        if (request == null) return null;
        // RequestIdFilter doesn't normalize x-forwarded-for; rely on Servlet
        // resolution which has already considered the proxy chain via
        // server.forward-headers-strategy=framework.
        return request.getRemoteAddr();
    }

    private static String uaOf(HttpServletRequest request) {
        if (request == null) return null;
        String ua = request.getHeader("User-Agent");
        if (ua == null) return null;
        // Match sam-app: cap at 512 chars to bound document size.
        return ua.length() > 512 ? ua.substring(0, 512) : ua;
    }
}
