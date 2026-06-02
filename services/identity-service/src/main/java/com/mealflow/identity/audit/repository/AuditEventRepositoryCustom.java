package com.mealflow.identity.audit.repository;

import java.time.Instant;
import java.util.List;

/**
 * Admin-only aggregations on the audit collection. Time-bucketed counts —
 * computed in MongoDB so the wire payload is small.
 */
public interface AuditEventRepositoryCustom {

    /**
     * Time-bucketed counts of (eventType, outcome) pairs.
     *
     * @param since      lower bound, exclusive
     * @param truncateToHour true → align buckets to hour boundaries, false → day
     */
    List<BucketRow> aggregateBuckets(Instant since, boolean truncateToHour);

    /** Window totals — separate from the bucket stream so the UI can render summary cards cheaply. */
    Totals aggregateTotals(Instant since);

    record BucketRow(Instant bucket, String eventType, String outcome, long count) {}

    record Totals(
            long totalLogins,
            long failedLogins,
            long registrations,
            long passwordResetsRequested,
            long securityFlags) {}
}
