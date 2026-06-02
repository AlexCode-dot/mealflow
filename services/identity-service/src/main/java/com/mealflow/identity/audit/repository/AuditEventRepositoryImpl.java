package com.mealflow.identity.audit.repository;

import com.mealflow.identity.audit.domain.AuditEvent;
import com.mealflow.identity.audit.domain.AuditEventType;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.aggregation.ComparisonOperators;
import org.springframework.data.mongodb.core.aggregation.ConditionalOperators;
import org.springframework.data.mongodb.core.aggregation.DateOperators;
import org.springframework.data.mongodb.core.query.Criteria;

/**
 * MongoDB aggregation pipelines for the admin panel's monitoring view.
 *
 * <p>Doing this in the DB instead of in-memory is important: even at
 * modest scale we expect thousands of audit rows per day, and we want
 * the wire payload to be ~24 rows (one bucket per hour) regardless of
 * how busy the system gets.
 */
public class AuditEventRepositoryImpl implements AuditEventRepositoryCustom {

    private final MongoTemplate mongo;

    public AuditEventRepositoryImpl(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    @Override
    public List<BucketRow> aggregateBuckets(Instant since, boolean truncateToHour) {
        // Project $createdAt → bucket boundary using $dateTrunc. We use
        // $dateTrunc rather than $dateToString so the output stays a real
        // Date and the client can keep doing Date math.
        String unit = truncateToHour ? "hour" : "day";

        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("createdAt").gte(Date.from(since))),
                Aggregation.project()
                        .and("eventType")
                        .as("eventType")
                        .and("outcome")
                        .as("outcome")
                        .and(DateOperators.DateTrunc.truncateValueOf("createdAt")
                                .to(unit))
                        .as("bucket"),
                Aggregation.group("bucket", "eventType", "outcome").count().as("count"),
                Aggregation.sort(org.springframework.data.domain.Sort.Direction.ASC, "_id.bucket"));

        AggregationResults<Document> results = mongo.aggregate(agg, AuditEvent.class, Document.class);

        List<BucketRow> out = new ArrayList<>();
        for (Document d : results.getMappedResults()) {
            Document key = d.get("_id", Document.class);
            if (key == null) continue;
            Date b = key.getDate("bucket");
            String eventType = key.getString("eventType");
            String outcome = key.getString("outcome");
            // Some events (admin/security) have a null outcome — coerce to
            // "success" so the panel's grouping (which keys on outcome) still
            // counts them rather than dropping them on the floor.
            if (outcome == null) outcome = AuditEventType.OUTCOME_SUCCESS;
            long count = d.getInteger("count", 0);
            if (b == null || eventType == null) continue;
            out.add(new BucketRow(b.toInstant(), eventType, outcome, count));
        }
        return out;
    }

    @Override
    public Totals aggregateTotals(Instant since) {
        Date sinceDate = Date.from(since);

        // Single pass over the matched window — five $sum-with-$cond branches.
        // Cheaper than five round-trips even at modest volume.
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("createdAt").gte(sinceDate)),
                Aggregation.group()
                        .sum(condCount(eventTypeEq(AuditEventType.LOGIN)))
                        .as("totalLogins")
                        .sum(condCount(loginFailure()))
                        .as("failedLogins")
                        .sum(condCount(eventTypeEq(AuditEventType.REGISTER)))
                        .as("registrations")
                        .sum(condCount(eventTypeEq(AuditEventType.PASSWORD_RESET_REQUESTED)))
                        .as("passwordResetsRequested")
                        .sum(condCount(eventTypeEq(AuditEventType.TOKEN_REUSE_DETECTED)))
                        .as("securityFlags"));

        AggregationResults<Document> results = mongo.aggregate(agg, AuditEvent.class, Document.class);
        Document row = results.getUniqueMappedResult();
        if (row == null) {
            return new Totals(0, 0, 0, 0, 0);
        }
        return new Totals(
                row.getInteger("totalLogins", 0),
                row.getInteger("failedLogins", 0),
                row.getInteger("registrations", 0),
                row.getInteger("passwordResetsRequested", 0),
                row.getInteger("securityFlags", 0));
    }

    /** Wraps a boolean predicate in a $cond returning 1/0 so $sum counts it. */
    private static ConditionalOperators.Cond condCount(
            org.springframework.data.mongodb.core.aggregation.AggregationExpression predicate) {
        return ConditionalOperators.when(predicate).then(1).otherwise(0);
    }

    private static ComparisonOperators.Eq eventTypeEq(String value) {
        return ComparisonOperators.valueOf("eventType").equalToValue(value);
    }

    private static org.springframework.data.mongodb.core.aggregation.BooleanOperators.And loginFailure() {
        return org.springframework.data.mongodb.core.aggregation.BooleanOperators.And.and(
                eventTypeEq(AuditEventType.LOGIN),
                ComparisonOperators.valueOf("outcome").equalToValue(AuditEventType.OUTCOME_FAILURE));
    }
}
