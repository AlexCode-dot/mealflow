package com.mealflow.appapi.integrations.v1;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

/**
 * Resource versions for the integration API. A resource's version is its {@code updatedAt} in
 * epoch milliseconds (Mongo stores millisecond precision); the ETag is that number quoted.
 *
 * <p>Writes are compare-and-set: the Mongo update filters on the {@code updatedAt} that was read
 * (and on {@code userId}), so a concurrent change between read and write makes the update match
 * nothing and the request fails with 412 instead of silently overwriting. Every integration write
 * moves {@code updatedAt} strictly forward so two writes in the same millisecond still get
 * distinct versions.
 */
public final class Versioning {

    private Versioning() {}

    public static Long version(Instant updatedAt) {
        return updatedAt == null ? null : updatedAt.toEpochMilli();
    }

    public static String etag(Instant updatedAt) {
        return "\"" + (updatedAt == null ? 0 : updatedAt.toEpochMilli()) + "\"";
    }

    /** Throws 412 when an If-Match header is present and does not match the current version. */
    public static void checkIfMatch(String ifMatch, Instant currentUpdatedAt) {
        if (ifMatch == null || ifMatch.isBlank()) {
            return;
        }
        String current = String.valueOf(currentUpdatedAt == null ? 0 : currentUpdatedAt.toEpochMilli());
        for (String candidate : ifMatch.split(",")) {
            String tag = candidate.trim();
            if (tag.equals("*")) {
                return;
            }
            if (tag.startsWith("W/")) {
                tag = tag.substring(2);
            }
            if (tag.length() >= 2 && tag.startsWith("\"") && tag.endsWith("\"")) {
                tag = tag.substring(1, tag.length() - 1);
            }
            if (tag.equals(current)) {
                return;
            }
        }
        throw IntegrationApiException.preconditionFailed();
    }

    /** Next {@code updatedAt}: now (ms precision), but always strictly after the previous value. */
    public static Instant next(Instant previous, Clock clock) {
        Instant now = clock.instant().truncatedTo(ChronoUnit.MILLIS);
        if (previous != null && !now.isAfter(previous)) {
            return previous.truncatedTo(ChronoUnit.MILLIS).plusMillis(1);
        }
        return now;
    }

    /**
     * Applies {@code update} only if the document still has the expected owner and {@code
     * updatedAt}; otherwise 412.
     */
    public static void compareAndSet(
            MongoTemplate mongo, Class<?> type, String id, String userId, Instant expectedUpdatedAt, Update update) {
        Query query = Query.query(Criteria.where("id")
                .is(id)
                .and("userId")
                .is(userId)
                .and("updatedAt")
                .is(expectedUpdatedAt));
        if (mongo.updateFirst(query, update, type).getMatchedCount() == 0) {
            throw IntegrationApiException.preconditionFailed();
        }
    }
}
