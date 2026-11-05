package com.mealflow.appapi.shoppingLists.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import java.util.function.Supplier;
import org.bson.Document;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

/**
 * Per-user mutual exclusion for decisions about which shopping list is the user's active one
 * ("find the active list or create one", "make this list active and archive the other"). It holds
 * across app-api instances because the lock lives in Mongo.
 *
 * <p>One lease document per user in {@code shopping_list_locks}, {@code _id = userId}. Acquire is a
 * {@code findAndModify} upsert on {@code {_id: userId, lockedUntil < now}}: if there is no document,
 * or the previous lease has expired, it is taken; while another holder's lease is live the upsert
 * collides on {@code _id} and the caller waits and retries. Release removes the document only if this
 * caller still owns it. A holder that dies leaves a lease that expires after {@link #LEASE}.
 *
 * <p>Not reentrant: code running under the lock must not take it again for the same user.
 */
@Component
public class ActiveShoppingListLock {

    static final String COLLECTION = "shopping_list_locks";
    static final Duration LEASE = Duration.ofSeconds(10);
    static final Duration MAX_WAIT = Duration.ofSeconds(5);
    private static final long RETRY_SLEEP_MS = 20;

    private final MongoTemplate mongo;
    private final Clock clock;

    public ActiveShoppingListLock(MongoTemplate mongo, Clock clock) {
        this.mongo = mongo;
        this.clock = clock;
    }

    public <T> T withLock(String userId, Supplier<T> action) {
        String owner = UUID.randomUUID().toString();
        acquire(userId, owner);
        try {
            return action.get();
        } finally {
            release(userId, owner);
        }
    }

    private void acquire(String userId, String owner) {
        long deadline = System.nanoTime() + MAX_WAIT.toNanos();
        while (true) {
            Instant now = clock.instant();
            Query free = Query.query(
                    Criteria.where("_id").is(userId).and("lockedUntil").lt(Date.from(now)));
            Update take = new Update().set("owner", owner).set("lockedUntil", Date.from(now.plus(LEASE)));
            try {
                mongo.findAndModify(
                        free, take, FindAndModifyOptions.options().upsert(true), Document.class, COLLECTION);
                return;
            } catch (DuplicateKeyException held) {
                if (System.nanoTime() > deadline) {
                    throw new ShoppingListBusyException("Shopping lists are being changed, try again");
                }
                sleep();
            }
        }
    }

    private void release(String userId, String owner) {
        mongo.remove(Query.query(Criteria.where("_id").is(userId).and("owner").is(owner)), COLLECTION);
    }

    private static void sleep() {
        try {
            Thread.sleep(RETRY_SLEEP_MS);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ShoppingListBusyException("Interrupted while waiting for the shopping list lock");
        }
    }
}
