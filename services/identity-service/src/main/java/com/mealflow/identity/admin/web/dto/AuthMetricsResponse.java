package com.mealflow.identity.admin.web.dto;

import java.time.Instant;
import java.util.List;

/**
 * Wire shape consumed by the admin panel's monitoring page.
 *
 * <p>This shape MUST stay byte-compatible with sam-app's
 * {@code admin.service.getAuthMetrics} — the panel's monitoring.tsx reads
 * {@code totals.failedLogins} and {@code buckets[].eventType/outcome/count}
 * directly. Any drift here crashes the page (we hit this exact bug while
 * wiring mealflow in).
 *
 * <p>mealflow has no audit log yet, so the response is always "empty but
 * well-formed": empty bucket list + zero totals. The page renders cleanly
 * with no data instead of throwing.
 */
public record AuthMetricsResponse(String since, String granularity, List<Bucket> buckets, Totals totals) {

    /** One row per (bucket, eventType, outcome) tuple. Same as sam-app. */
    public record Bucket(String bucket, String eventType, String outcome, long count) {}

    public record Totals(
            long totalLogins, long failedLogins, long registrations, long passwordResetsRequested, long securityFlags) {

        public static Totals empty() {
            return new Totals(0, 0, 0, 0, 0);
        }
    }

    public static AuthMetricsResponse empty(Instant since, String granularity) {
        return new AuthMetricsResponse(since.toString(), granularity, List.of(), Totals.empty());
    }
}
