package com.mealflow.identity.admin.web;

import com.mealflow.identity.admin.web.dto.AdminHealthResponse;
import com.mealflow.identity.admin.web.dto.AdminStatsResponse;
import com.mealflow.identity.admin.web.dto.AuthMetricsResponse;
import com.mealflow.identity.audit.repository.AuditEventRepository;
import com.mealflow.identity.audit.repository.AuditEventRepositoryCustom;
import com.mealflow.identity.user.repository.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Health / stats / metrics endpoints consumed by the admin panel's overview
 * and monitoring pages.
 *
 * <p>mealflow has no audit log today, so {@code /metrics/auth} returns an
 * empty time series. That's intentional: the panel renders "no data" rather
 * than crashing, and this endpoint becomes a real data source once an audit
 * collection lands.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminMetaController {

    private final UserRepository userRepository;
    private final AuditEventRepository auditRepository;
    private final MongoTemplate mongo;
    private final Clock clock;
    private final String environment;
    private final String version;

    public AdminMetaController(
            UserRepository userRepository,
            AuditEventRepository auditRepository,
            MongoTemplate mongo,
            Clock clock,
            @Value("${spring.profiles.active:development}") String activeProfile,
            @Value("${app.version:0.0.0}") String version) {
        this.userRepository = userRepository;
        this.auditRepository = auditRepository;
        this.mongo = mongo;
        this.clock = clock;
        this.environment = normalizeEnvironment(activeProfile);
        this.version = version;
    }

    @GetMapping("/health")
    public AdminHealthResponse health() {
        boolean dbReachable;
        try {
            // Cheap round-trip — confirms the connection actually works.
            mongo.executeCommand("{ ping: 1 }");
            dbReachable = true;
        } catch (RuntimeException e) {
            dbReachable = false;
        }
        Instant now = clock.instant();
        // Mealflow only ships /api/admin/users + meta endpoints — no workspaces,
        // feature flags, or broadcast. Advertise the empty feature set so the
        // admin panel hides the corresponding tabs instead of probing endpoints
        // that don't exist (which Spring routes to /error → 401, not 404).
        return new AdminHealthResponse(dbReachable, version, environment, null, dbReachable, now, java.util.List.of());
    }

    @GetMapping("/stats")
    public AdminStatsResponse stats() {
        Instant now = clock.instant();
        Instant dayAgo = now.minus(Duration.ofDays(1));
        Instant weekAgo = now.minus(Duration.ofDays(7));

        long total = userRepository.countByDeletedAtIsNull();
        long signupsToday = userRepository.countByCreatedAtAfter(dayAgo);
        long signupsThisWeek = userRepository.countByCreatedAtAfter(weekAgo);

        // "active" in mealflow = not soft-deleted, not disabled. We approximate
        // by total - disabled, which avoids a second collection scan.
        long disabled = countDisabled();
        long active = total - disabled;

        // DAU/WAU/MRR aren't tracked in mealflow yet — send null so the UI
        // renders "—" rather than 0 (which would be a lie).
        return new AdminStatsResponse(total, active, signupsToday, signupsThisWeek, null, null, null, now);
    }

    @GetMapping("/metrics/auth")
    public AuthMetricsResponse authMetrics(
            @RequestParam(required = false, defaultValue = "24") int sinceHours,
            @RequestParam(required = false, defaultValue = "hour") String granularity) {

        int clampedHours = Math.min(Math.max(sinceHours, 1), 24 * 31);
        String normalizedGranularity = "day".equals(granularity) ? "day" : "hour";
        boolean truncateToHour = "hour".equals(normalizedGranularity);

        Instant since = clock.instant().minus(Duration.ofHours(clampedHours));

        // Two aggregations in parallel would be ideal, but at our scale this is
        // sub-100ms total — keeping it sequential for simplicity.
        List<AuditEventRepositoryCustom.BucketRow> rows = auditRepository.aggregateBuckets(since, truncateToHour);
        AuditEventRepositoryCustom.Totals totals = auditRepository.aggregateTotals(since);

        List<AuthMetricsResponse.Bucket> buckets = new ArrayList<>(rows.size());
        for (AuditEventRepositoryCustom.BucketRow r : rows) {
            buckets.add(new AuthMetricsResponse.Bucket(r.bucket().toString(), r.eventType(), r.outcome(), r.count()));
        }

        AuthMetricsResponse.Totals wireTotals = new AuthMetricsResponse.Totals(
                totals.totalLogins(),
                totals.failedLogins(),
                totals.registrations(),
                totals.passwordResetsRequested(),
                totals.securityFlags());

        return new AuthMetricsResponse(since.toString(), normalizedGranularity, buckets, wireTotals);
    }

    private long countDisabled() {
        org.springframework.data.mongodb.core.query.Query q = new org.springframework.data.mongodb.core.query.Query();
        q.addCriteria(org.springframework.data.mongodb.core.query.Criteria.where("disabledAt")
                .ne(null));
        q.addCriteria(org.springframework.data.mongodb.core.query.Criteria.where("deletedAt")
                .is(null));
        return mongo.count(q, com.mealflow.identity.user.domain.User.class);
    }

    private static String normalizeEnvironment(String activeProfile) {
        // Spring profile names → admin contract enum ("production" | "staging" | "development")
        if (activeProfile == null || activeProfile.isBlank()) return "development";
        String first = activeProfile.split(",")[0].trim();
        return switch (first) {
            case "prod", "production" -> "production";
            case "staging", "stage" -> "staging";
            default -> "development";
        };
    }
}
