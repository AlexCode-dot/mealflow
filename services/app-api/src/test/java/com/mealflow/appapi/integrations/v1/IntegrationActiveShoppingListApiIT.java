package com.mealflow.appapi.integrations.v1;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.appapi.shoppingLists.domain.ShoppingList;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListItem;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListStatus;
import com.mealflow.appapi.shoppingLists.repository.ShoppingListRepository;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** MF3: {@code POST /integrations/v1/shopping-lists/active}. */
class IntegrationActiveShoppingListApiIT extends IntegrationApiTestBase {

    private static final String ACTIVE = "/integrations/v1/shopping-lists/active";

    @Autowired
    ShoppingListRepository listRepository;

    private ShoppingList seedList(String userId, ShoppingListStatus status, String title) {
        Instant at = Instant.now().minusSeconds(60).truncatedTo(ChronoUnit.MILLIS);
        return listRepository.save(new ShoppingList(
                userId,
                status,
                null,
                title,
                List.of(new ShoppingListItem("item-1", "Eggs", 12.0, "pcs", false)),
                at,
                at));
    }

    private List<ShoppingList> activeLists(String userId) {
        return listRepository.findAllByUserIdAndStatusOrderByUpdatedAtDesc(userId, ShoppingListStatus.ACTIVE);
    }

    private HttpResponse<String> ensureActive(String token, String idempotencyKey) throws Exception {
        return send(ACTIVE, token, "POST", null, idempotencyKey, null);
    }

    @Test
    void noList_creates201WithLocationAndEtag_andExactlyOneActiveList() throws Exception {
        String user = "active-none";
        String token = token(user, ALL_SCOPES);

        HttpResponse<String> res = ensureActive(token, key());

        assertThat(res.body(), res.statusCode(), is(201));
        String id = JsonPath.read(res.body(), "$.id");
        assertThat(res.headers().firstValue("Location").orElse(null), is("/integrations/v1/shopping-lists/" + id));
        assertThat(JsonPath.read(res.body(), "$.status"), is("active"));
        assertThat(JsonPath.read(res.body(), "$.title"), nullValue());
        assertThat(JsonPath.read(res.body(), "$.items"), hasSize(0));
        long version = ((Number) JsonPath.read(res.body(), "$.version")).longValue();
        assertThat(etag(res), is("\"" + version + "\""));

        List<ShoppingList> active = activeLists(user);
        assertThat(active, hasSize(1));
        assertThat(active.get(0).getId(), is(id));
        assertThat(active.get(0).getWeeklyPlanId(), nullValue());

        // The created list is what GET returns, with the same version.
        HttpResponse<String> got = get("/integrations/v1/shopping-lists/" + id, token);
        assertThat(got.statusCode(), is(200));
        assertThat(etag(got), is(etag(res)));
        assertThat(got.body(), is(res.body()));
    }

    @Test
    void activeListExists_returns200WithSameId_asGetDoes_andWritesNothing() throws Exception {
        String user = "active-exists";
        String token = token(user, ALL_SCOPES);
        seedList(user, ShoppingListStatus.ARCHIVED, "Old");
        ShoppingList existing = seedList(user, ShoppingListStatus.ACTIVE, "Current");
        HttpResponse<String> got = get("/integrations/v1/shopping-lists/" + existing.getId(), token);

        HttpResponse<String> res = ensureActive(token, key());

        assertThat(res.body(), res.statusCode(), is(200));
        assertThat(JsonPath.read(res.body(), "$.id"), is(existing.getId()));
        assertThat(res.headers().firstValue("Location").isPresent(), is(false));
        assertThat(etag(res), is(etag(got)));
        assertThat(res.body(), is(got.body()));

        assertThat(listRepository.findAllByUserIdOrderByUpdatedAtDesc(user), hasSize(2));
        ShoppingList after = listRepository.findById(existing.getId()).orElseThrow();
        assertThat(after.getUpdatedAt(), is(existing.getUpdatedAt()));
        assertThat(after.getItems(), hasSize(1));
    }

    @Test
    void onlyArchivedLists_createsANewActiveList_andLeavesArchivedUntouched() throws Exception {
        String user = "active-archived-only";
        String token = token(user, ALL_SCOPES);
        ShoppingList archived = seedList(user, ShoppingListStatus.ARCHIVED, "Old");

        HttpResponse<String> res = ensureActive(token, key());

        assertThat(res.statusCode(), is(201));
        assertThat(JsonPath.read(res.body(), "$.id"), not(is(archived.getId())));
        assertThat(activeLists(user), hasSize(1));
        ShoppingList stillArchived = listRepository.findById(archived.getId()).orElseThrow();
        assertThat(stillArchived.getStatus(), is(ShoppingListStatus.ARCHIVED));
        assertThat(stillArchived.getUpdatedAt(), is(archived.getUpdatedAt()));
    }

    @Test
    void concurrentCalls_withDifferentKeys_createExactlyOneList() throws Exception {
        String user = "active-concurrent";
        String token = token(user, ALL_SCOPES);
        int callers = 8;
        ExecutorService pool = Executors.newFixedThreadPool(callers);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<HttpResponse<String>>> futures = new ArrayList<>();
        try {
            for (int i = 0; i < callers; i++) {
                futures.add(pool.submit(() -> {
                    start.await();
                    return ensureActive(token, key());
                }));
            }
            start.countDown();
            List<Integer> statuses = new ArrayList<>();
            List<String> ids = new ArrayList<>();
            for (Future<HttpResponse<String>> f : futures) {
                HttpResponse<String> res = f.get();
                statuses.add(res.statusCode());
                ids.add(JsonPath.read(res.body(), "$.id"));
            }

            assertThat(statuses.stream().filter(s -> s == 201).count(), is(1L));
            assertThat(statuses.stream().filter(s -> s == 200).count(), is((long) callers - 1));
            assertThat(ids, everyItem(is(ids.get(0))));
            assertThat(listRepository.findAllByUserIdOrderByUpdatedAtDesc(user), hasSize(1));
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void replayedKey_returnsTheFirstResponse_andCreatesNoSecondList() throws Exception {
        String user = "active-replay";
        String token = token(user, ALL_SCOPES);
        String k = key();

        HttpResponse<String> first = ensureActive(token, k);
        HttpResponse<String> other = ensureActive(token, key());
        HttpResponse<String> replay = ensureActive(token, k);

        assertThat(first.statusCode(), is(201));
        assertThat(other.statusCode(), is(200));
        assertThat(replay.statusCode(), is(201));
        assertThat(replay.headers().firstValue("Idempotency-Replayed").orElse(null), is("true"));
        assertThat(replay.body(), is(first.body()));
        assertThat(etag(replay), is(etag(first)));
        assertThat(
                replay.headers().firstValue("Location").orElse(null),
                is(first.headers().firstValue("Location").orElse(null)));
        assertThat(listRepository.findAllByUserIdOrderByUpdatedAtDesc(user), hasSize(1));
    }

    @Test
    void missingIdempotencyKey_is400_andCreatesNothing() throws Exception {
        String user = "active-nokey";
        HttpResponse<String> res = ensureActive(token(user, ALL_SCOPES), null);

        assertThat(res.statusCode(), is(400));
        assertThat(res.headers().firstValue("Content-Type").orElse(""), containsString("application/problem+json"));
        assertThat(listRepository.findAllByUserIdOrderByUpdatedAtDesc(user), hasSize(0));
    }

    @Test
    void withoutShoppingListWriteScope_is403_andCreatesNothing() throws Exception {
        String user = "active-scope";
        List<String> allButShoppingWrite =
                ALL_SCOPES.stream().filter(s -> !s.equals("shoppinglist.write")).toList();

        for (List<String> scopes : List.of(READ_SCOPES, allButShoppingWrite)) {
            HttpResponse<String> res = ensureActive(token(user, scopes), key());
            assertThat(res.body(), res.statusCode(), is(403));
            assertThat(res.headers().firstValue("Content-Type").orElse(""), containsString("application/problem+json"));
        }
        assertThat(listRepository.findAllByUserIdOrderByUpdatedAtDesc(user), hasSize(0));
    }

    @Test
    void anotherUsersActiveList_isNeverReturned() throws Exception {
        ShoppingList listOfA = seedList("active-iso-a", ShoppingListStatus.ACTIVE, "A's list");
        String tokenB = token("active-iso-b", ALL_SCOPES);

        HttpResponse<String> res = ensureActive(tokenB, key());

        assertThat(res.statusCode(), is(201));
        assertThat(JsonPath.read(res.body(), "$.id"), not(is(listOfA.getId())));
        assertThat(res.body(), not(containsString("A's list")));
        assertThat(activeLists("active-iso-b"), hasSize(1));
        List<ShoppingList> listsOfA = listRepository.findAllByUserIdOrderByUpdatedAtDesc("active-iso-a");
        assertThat(listsOfA, hasSize(1));
        assertThat(listsOfA.get(0).getUpdatedAt(), is(listOfA.getUpdatedAt()));
    }
}
