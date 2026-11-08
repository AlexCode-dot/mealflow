package com.mealflow.appapi.integrations.v1;

import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import jakarta.annotation.PostConstruct;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.concurrent.TimeUnit;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/**
 * Cost cap for {@code POST /shopping-lists/active/from-plan}, which may call the LLM: per user, at most
 * {@code integrations.from-plan.per-minute} (default 5) per clock minute and {@code
 * integrations.from-plan.per-day} (default 30) per calendar day in the integration time zone.
 *
 * <p>Counters live in Mongo ({@value #COLLECTION}, one document per user and window, removed by a TTL
 * index after the window), so the cap holds across app-api instances and restarts. Only executions
 * count: an idempotent replay never reaches the limiter. A request over the minute limit does not
 * count against the day.
 */
@Service
public class FromPlanRateLimiter {

    static final String COLLECTION = "integration_from_plan_usage";

    private final MongoTemplate mongo;
    private final Clock clock;
    private final ZoneId zone;
    private final int perMinute;
    private final int perDay;

    public FromPlanRateLimiter(
            MongoTemplate mongo,
            Clock clock,
            @Value("${integrations.timezone:Europe/Stockholm}") String zone,
            @Value("${integrations.from-plan.per-minute:5}") int perMinute,
            @Value("${integrations.from-plan.per-day:30}") int perDay) {
        this.mongo = mongo;
        this.clock = clock;
        this.zone = ZoneId.of(zone);
        this.perMinute = perMinute;
        this.perDay = perDay;
    }

    @PostConstruct
    void ensureIndexes() {
        mongo.getCollection(COLLECTION)
                .createIndex(
                        Indexes.ascending("expiresAt"),
                        new IndexOptions().name("from_plan_usage_ttl").expireAfter(0L, TimeUnit.SECONDS));
    }

    /** Counts one execution for the user, or throws {@link FromPlanRateLimitedException} (429). */
    public void acquire(String userId) {
        Instant now = clock.instant();
        long minute = now.getEpochSecond() / 60;
        Instant minuteEnd = Instant.ofEpochSecond((minute + 1) * 60);
        if (increment(minuteKey(userId, minute), minuteEnd) > perMinute) {
            throw new FromPlanRateLimitedException(
                    "At most " + perMinute + " shopping lists from a plan per minute", secondsUntil(now, minuteEnd));
        }
        LocalDate day = LocalDate.ofInstant(now, zone);
        Instant dayEnd = day.plusDays(1).atStartOfDay(zone).toInstant();
        if (increment(dayKey(userId, day), dayEnd) > perDay) {
            throw new FromPlanRateLimitedException(
                    "At most " + perDay + " shopping lists from a plan per day", secondsUntil(now, dayEnd));
        }
    }

    static String minuteKey(String userId, long epochMinute) {
        return userId + "|m|" + epochMinute;
    }

    static String dayKey(String userId, LocalDate day) {
        return userId + "|d|" + day;
    }

    private long increment(String id, Instant expiresAt) {
        Document counter = mongo.findAndModify(
                Query.query(Criteria.where("_id").is(id)),
                new Update().inc("count", 1).setOnInsert("expiresAt", Date.from(expiresAt)),
                FindAndModifyOptions.options().upsert(true).returnNew(true),
                Document.class,
                COLLECTION);
        return counter == null ? 1 : ((Number) counter.get("count")).longValue();
    }

    private static long secondsUntil(Instant now, Instant end) {
        return Math.max(1, (Duration.between(now, end).toMillis() + 999) / 1000);
    }
}
