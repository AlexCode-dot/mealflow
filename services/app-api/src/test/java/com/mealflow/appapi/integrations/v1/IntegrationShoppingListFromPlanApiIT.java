package com.mealflow.appapi.integrations.v1;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.lessThanOrEqualTo;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockingDetails;
import static org.mockito.Mockito.when;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.appapi.recipes.extraction.client.AnthropicClient;
import com.mealflow.appapi.recipes.extraction.client.AnthropicMessageRequest;
import com.mealflow.appapi.recipes.extraction.client.AnthropicMessageResponse;
import com.mealflow.appapi.recipes.repository.RecipeRepository;
import com.mealflow.appapi.shoppingLists.domain.ShoppingList;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListItem;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListStatus;
import com.mealflow.appapi.shoppingLists.repository.ShoppingListRepository;
import java.net.http.HttpResponse;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/**
 * MF4: {@code POST /integrations/v1/shopping-lists/active/from-plan}. Anthropic is "configured" with a
 * mocked client, so the app's generator runs its LLM steps exactly as in production and the test can
 * count them: the name normalizer maps "Gul lök, hackad" to "Gul lök" and keeps every other name.
 */
@TestPropertySource(properties = "anthropic.api-key=test-key")
class IntegrationShoppingListFromPlanApiIT extends IntegrationApiTestBase {

    private static final String FROM_PLAN = "/integrations/v1/shopping-lists/active/from-plan";
    private static final String NORMALIZER_PROMPT_START = "You clean up ingredient names";

    @MockitoBean
    AnthropicClient anthropicClient;

    @Autowired
    ShoppingListRepository listRepository;

    @Autowired
    RecipeRepository recipeRepository;

    @Autowired
    MongoTemplate mongo;

    /** Runs inside every categorisation call (the step between reading and writing the list). */
    private volatile Runnable duringCategorize = () -> {};

    private final AtomicInteger categorizeCalls = new AtomicInteger();

    @BeforeEach
    void fakeLlm() {
        duringCategorize = () -> {};
        categorizeCalls.set(0);
        when(anthropicClient.createMessage(any())).thenAnswer(inv -> {
            AnthropicMessageRequest request = inv.getArgument(0);
            if (request.system() == null || !request.system().startsWith(NORMALIZER_PROMPT_START)) {
                categorizeCalls.incrementAndGet();
                duringCategorize.run();
            }
            return reply(request);
        });
    }

    /** Normalizer: "Gul lök, hackad" -> "Gul lök", everything else unchanged, aisle pantry. Categorizer: no answer. */
    private static AnthropicMessageResponse reply(AnthropicMessageRequest request) {
        if (request.system() == null || !request.system().startsWith(NORMALIZER_PROMPT_START)) {
            return text("{}");
        }
        String user = request.messages().get(0).content().get(0).text();
        String json = user.lines()
                .filter(l -> l.matches("\\d+\\. .*"))
                .map(l -> {
                    String n = l.substring(0, l.indexOf('.'));
                    String name = l.substring(l.indexOf(". ") + 2).trim();
                    String product = name.equals("Gul lök, hackad") ? "Gul lök" : name;
                    String aisle = product.equals("Gul lök") ? "produce" : "pantry";
                    return "\"" + n + "\":[\"" + product + "\",\"" + aisle + "\"]";
                })
                .collect(Collectors.joining(",", "{", "}"));
        return text(json);
    }

    private static AnthropicMessageResponse text(String text) {
        return new AnthropicMessageResponse(
                "msg",
                "message",
                "assistant",
                "m",
                "end_turn",
                List.of(new AnthropicMessageResponse.ContentBlock("text", text)),
                null);
    }

    private int llmCalls() {
        return mockingDetails(anthropicClient).getInvocations().size();
    }

    private static LocalDate currentMonday() {
        return LocalDate.now(ZoneId.of("Europe/Stockholm")).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    private String recipe(String token, String json) throws Exception {
        HttpResponse<String> res = post("/integrations/v1/recipes", token, json, key());
        assertThat(res.body(), res.statusCode(), is(201));
        return JsonPath.read(res.body(), "$.id");
    }

    /** Tacos for 4: 1000 g mince, 8 tortillas, salt (no amount), 2 dl sour cream, 2 chopped onions. */
    private String tacos(String token) throws Exception {
        return recipe(token, """
                {"title":"Tacos","portions":4,"ingredients":[
                  {"name":"Köttfärs","quantity":1000,"unit":"g"},
                  {"name":"Tortillas","quantity":8,"unit":"st"},
                  {"name":"Salt"},
                  {"name":"Gräddfil","quantity":2,"unit":"dl"},
                  {"name":"Gul lök, hackad","quantity":2,"unit":"st"}]}
                """);
    }

    private HttpResponse<String> addEntry(String token, String week, String json) throws Exception {
        HttpResponse<String> res = post("/integrations/v1/meal-plans/" + week + "/entries", token, json, key());
        assertThat(res.body(), res.statusCode(), is(201));
        return res;
    }

    private HttpResponse<String> fromPlan(String token, String week, String idempotencyKey) throws Exception {
        return post(FROM_PLAN, token, "{\"week\":\"" + week + "\"}", idempotencyKey);
    }

    private List<ShoppingList> activeLists(String userId) {
        return listRepository.findAllByUserIdAndStatusOrderByUpdatedAtDesc(userId, ShoppingListStatus.ACTIVE);
    }

    private static Map<String, Object> item(String body, String name) {
        List<Map<String, Object>> items = JsonPath.read(body, "$.items[?(@.name == '" + name + "')]");
        assertThat(body, items, hasSize(1));
        return items.get(0);
    }

    private static double quantity(Map<String, Object> item) {
        return ((Number) item.get("quantity")).doubleValue();
    }

    @Test
    void emptyWeek_is422PlanEmpty_andWritesNothing() throws Exception {
        String user = "fp-empty";
        String token = token(user, ALL_SCOPES);

        // No plan at all.
        HttpResponse<String> noPlan = fromPlan(token, "current", key());
        assertThat(noPlan.body(), noPlan.statusCode(), is(422));
        assertThat(noPlan.headers().firstValue("Content-Type").orElse(""), containsString("application/problem+json"));
        assertThat(JsonPath.read(noPlan.body(), "$.code"), is("plan_empty"));
        assertThat(listRepository.findAllByUserIdOrderByUpdatedAtDesc(user), hasSize(0));

        // A plan whose only dinner is a recipe without ingredients: still nothing to buy.
        String bare = recipe(token, "{\"title\":\"Rester\"}");
        addEntry(token, "current", "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + bare + "\"}");
        HttpResponse<String> noIngredients = fromPlan(token, "current", key());
        assertThat(noIngredients.body(), noIngredients.statusCode(), is(422));
        assertThat(JsonPath.read(noIngredients.body(), "$.code"), is("plan_empty"));

        // Another user's planned week is never used.
        String other = token("fp-empty-other", ALL_SCOPES);
        String othersTacos = tacos(other);
        addEntry(other, "next", "{\"day\":\"TUE\",\"section\":\"Dinner\",\"recipeId\":\"" + othersTacos + "\"}");
        HttpResponse<String> nextWeek = fromPlan(token, "next", key());
        assertThat(nextWeek.body(), nextWeek.statusCode(), is(422));

        assertThat(listRepository.findAllByUserIdOrderByUpdatedAtDesc(user), hasSize(0));
        assertThat(llmCalls(), is(0));
    }

    @Test
    void noActiveList_createsTheActiveListWithThePlansIngredients_scaledByPortions() throws Exception {
        String user = "fp-new";
        String token = token(user, ALL_SCOPES);
        String tacos = tacos(token);
        HttpResponse<String> planned = addEntry(
                token,
                "current",
                "{\"day\":\"THU\",\"section\":\"Dinner\",\"recipeId\":\"" + tacos + "\",\"portions\":2}");
        String planId = JsonPath.read(planned.body(), "$.id");

        HttpResponse<String> res = fromPlan(token, "current", key());

        assertThat(res.body(), res.statusCode(), is(200));
        assertThat(JsonPath.read(res.body(), "$.status"), is("active"));
        assertThat(JsonPath.read(res.body(), "$.added"), is(5));
        assertThat(JsonPath.read(res.body(), "$.merged"), is(0));
        assertThat(JsonPath.read(res.body(), "$.items"), hasSize(5));
        // Half of a 4-portion recipe.
        assertThat(quantity(item(res.body(), "Köttfärs")), is(closeTo(500.0, 0.001)));
        assertThat(item(res.body(), "Köttfärs").get("unit"), is("g"));
        assertThat(quantity(item(res.body(), "Tortillas")), is(closeTo(4.0, 0.001)));
        assertThat(quantity(item(res.body(), "Gul lök")), is(closeTo(1.0, 0.001)));
        assertThat(item(res.body(), "Gul lök").get("category"), is("produce"));
        assertThat(item(res.body(), "Salt").get("quantity"), is((Object) null));
        int week = currentMonday().get(WeekFields.ISO.weekOfWeekBasedYear());
        assertThat(JsonPath.read(res.body(), "$.title"), is("Week " + week + " Shopping List"));
        long version = ((Number) JsonPath.read(res.body(), "$.version")).longValue();
        assertThat(etag(res), is("\"" + version + "\""));

        List<ShoppingList> active = activeLists(user);
        assertThat(active, hasSize(1));
        String listId = JsonPath.read(res.body(), "$.id");
        assertThat(active.get(0).getId(), is(listId));
        assertThat(active.get(0).getWeeklyPlanId(), is(planId));

        // The response is the stored list: GET gives the same version and items.
        HttpResponse<String> got = get("/integrations/v1/shopping-lists/" + listId, token);
        assertThat(etag(got), is(etag(res)));
        assertThat(JsonPath.read(got.body(), "$.items"), hasSize(5));

        // One normalization call; every name got an aisle from it, so no categorization call.
        assertThat(llmCalls(), is(1));
    }

    @Test
    void existingListWithADuplicate_mergesAsTheAppDoes() throws Exception {
        String user = "fp-merge";
        String token = token(user, ALL_SCOPES);
        Instant at = Instant.now().minusSeconds(60).truncatedTo(ChronoUnit.MILLIS);
        ShoppingList seeded = listRepository.save(new ShoppingList(
                user,
                ShoppingListStatus.ACTIVE,
                null,
                "Min lista",
                List.of(
                        new ShoppingListItem("e-mince", "Köttfärs", 400.0, "g", false),
                        new ShoppingListItem("e-tortilla", "Tortillas", 2.0, "st", true),
                        new ShoppingListItem("e-salt", "salt", null, null, false),
                        new ShoppingListItem("e-onion", "Gul lök", 1.0, "st", false),
                        new ShoppingListItem("e-cream", "Gräddfil", 1.0, "l", false),
                        new ShoppingListItem("e-milk", "Mjölk", 1.0, "l", false)),
                at,
                at));
        String tacos = tacos(token);
        addEntry(
                token,
                "current",
                "{\"day\":\"FRI\",\"section\":\"Dinner\",\"recipeId\":\"" + tacos + "\",\"portions\":2}");

        HttpResponse<String> res = fromPlan(token, "current", key());

        assertThat(res.body(), res.statusCode(), is(200));
        assertThat(JsonPath.read(res.body(), "$.id"), is(seeded.getId()));
        assertThat(JsonPath.read(res.body(), "$.title"), is("Min lista"));
        // Merged into: Köttfärs (400 + 500 g), salt (no amount, absorbed), Gul lök (1 + 1 st, via the
        // normalized "Gul lök, hackad"); Gräddfil: 1 l + 1 dl -> 11 dl (same unit family).
        assertThat(JsonPath.read(res.body(), "$.merged"), is(4));
        // Added beside: Tortillas (the existing line is already checked).
        assertThat(JsonPath.read(res.body(), "$.added"), is(1));
        assertThat(JsonPath.read(res.body(), "$.items"), hasSize(7));
        assertThat(quantity(item(res.body(), "Köttfärs")), is(closeTo(900.0, 0.001)));
        assertThat(quantity(item(res.body(), "Gul lök")), is(closeTo(2.0, 0.001)));
        assertThat(item(res.body(), "Mjölk").get("quantity"), is((Object) 1.0));
        List<Map<String, Object>> tortillas = JsonPath.read(res.body(), "$.items[?(@.name == 'Tortillas')]");
        assertThat(tortillas, hasSize(2));
        assertThat(JsonPath.read(res.body(), "$.items[?(@.id == 'e-tortilla')].checked"), is(List.of(true)));
        assertThat(JsonPath.read(res.body(), "$.items[?(@.id == 'e-mince')].quantity"), is(List.of(900.0)));
        assertThat(etag(res), not(is("\"" + at.toEpochMilli() + "\"")));

        assertThat(activeLists(user), hasSize(1));
        assertThat(llmCalls(), lessThanOrEqualTo(2));
    }

    @Test
    void replayedKey_returnsTheFirstResponse_andAddsThePlanOnce() throws Exception {
        String user = "fp-replay";
        String token = token(user, ALL_SCOPES);
        String tacos = tacos(token);
        addEntry(token, "next", "{\"day\":\"SAT\",\"section\":\"Dinner\",\"recipeId\":\"" + tacos + "\"}");
        String k = key();

        HttpResponse<String> first = fromPlan(token, "next", k);
        assertThat(first.body(), first.statusCode(), is(200));
        int callsAfterFirst = llmCalls();

        HttpResponse<String> replay = fromPlan(token, "next", k);
        assertThat(replay.statusCode(), is(200));
        assertThat(replay.body(), is(first.body()));
        assertThat(etag(replay), is(etag(first)));
        assertThat(replay.headers().firstValue("Idempotency-Replayed").orElse(null), is("true"));
        assertThat(llmCalls(), is(callsAfterFirst));
        List<ShoppingList> active = activeLists(user);
        assertThat(active, hasSize(1));
        ShoppingListItem mince = active.get(0).getItems().stream()
                .filter(i -> i.getName().equals("Köttfärs"))
                .findFirst()
                .orElseThrow();
        assertThat(mince.getQuantity(), is(closeTo(1000.0, 0.001)));

        // Same key, different week: 422 (key reuse), nothing written.
        HttpResponse<String> reused = fromPlan(token, "current", k);
        assertThat(reused.statusCode(), is(422));

        // A new key adds the plan again, as the app's "add from plan" does: amounts are summed.
        HttpResponse<String> again = fromPlan(token, "next", key());
        assertThat(again.statusCode(), is(200));
        assertThat(quantity(item(again.body(), "Köttfärs")), is(closeTo(2000.0, 0.001)));
        assertThat(JsonPath.read(again.body(), "$.added"), is(0));
        assertThat(JsonPath.read(again.body(), "$.merged"), is(5));
    }

    @Test
    void wrongScope_is403_andWritesNothing() throws Exception {
        String user = "fp-scope";
        String full = token(user, ALL_SCOPES);
        String tacos = tacos(full);
        addEntry(full, "current", "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + tacos + "\"}");

        List<List<String>> missing = List.of(
                ALL_SCOPES.stream().filter(s -> !s.equals("mealplan.read")).toList(),
                ALL_SCOPES.stream().filter(s -> !s.equals("shoppinglist.write")).toList(),
                READ_SCOPES);
        for (List<String> scopes : missing) {
            HttpResponse<String> res = fromPlan(token(user, scopes), "current", key());
            assertThat(scopes + ": " + res.body(), res.statusCode(), is(403));
            assertThat(res.headers().firstValue("Content-Type").orElse(""), containsString("application/problem+json"));
        }
        assertThat(listRepository.findAllByUserIdOrderByUpdatedAtDesc(user), hasSize(0));
        assertThat(llmCalls(), is(0));
    }

    // ---- MF4 QA follow-up -------------------------------------------------------------------

    @Test
    void missingMealplanRead_isTheSameSecurity403AsOtherScopeFailures_beforeBodyValidation() throws Exception {
        String user = "fp-sec";
        String noPlanRead = token(
                user,
                ALL_SCOPES.stream().filter(s -> !s.equals("mealplan.read")).toList());
        // Reference: an ordinary scope failure from the security chain.
        HttpResponse<String> reference =
                send("/integrations/v1/shopping-lists/active", token(user, READ_SCOPES), "POST", null, key(), null);
        assertThat(reference.statusCode(), is(403));

        // Invalid body and no Idempotency-Key: still 403, so the security chain answered first.
        HttpResponse<String> res = send(FROM_PLAN, noPlanRead, "POST", "{}", null, null);

        assertThat(res.body(), res.statusCode(), is(403));
        assertThat(res.headers().firstValue("Content-Type").orElse(""), containsString("application/problem+json"));
        assertThat(JsonPath.read(res.body(), "$.title"), is((Object) JsonPath.read(reference.body(), "$.title")));
        assertThat(JsonPath.read(res.body(), "$.detail"), is((Object) JsonPath.read(reference.body(), "$.detail")));
        assertThat(listRepository.findAllByUserIdOrderByUpdatedAtDesc(user), hasSize(0));
    }

    @Test
    void twoParallelCalls_withDifferentKeys_oneActiveList_bothSucceed_amountsAddedTwice() throws Exception {
        String user = "fp-parallel";
        String token = token(user, ALL_SCOPES);
        String tacos = tacos(token);
        addEntry(token, "current", "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + tacos + "\"}");

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<HttpResponse<String>>> calls = new ArrayList<>();
            for (int i = 0; i < 2; i++) {
                calls.add(pool.submit(() -> {
                    start.await();
                    return fromPlan(token, "current", key());
                }));
            }
            start.countDown();
            for (Future<HttpResponse<String>> call : calls) {
                HttpResponse<String> res = call.get();
                assertThat(res.body(), res.statusCode(), is(200));
            }
        } finally {
            pool.shutdownNow();
        }

        List<ShoppingList> active = activeLists(user);
        assertThat(active, hasSize(1));
        List<ShoppingListItem> mince = active.get(0).getItems().stream()
                .filter(i -> i.getName().equals("Köttfärs"))
                .toList();
        assertThat(mince, hasSize(1));
        assertThat(mince.get(0).getQuantity(), is(closeTo(2000.0, 0.001)));
    }

    /** An active list with an item no keyword knows ("Pryl"), so the category step calls the LLM. */
    private ShoppingList seedListNeedingCategorisation(String user) {
        Instant at = Instant.now().minusSeconds(60).truncatedTo(ChronoUnit.MILLIS);
        return listRepository.save(new ShoppingList(
                user,
                ShoppingListStatus.ACTIVE,
                null,
                null,
                List.of(
                        new ShoppingListItem("e-pryl", "Pryl", null, null, false),
                        new ShoppingListItem("e-milk", "Mjölk", 1.0, "l", false)),
                at,
                at));
    }

    /** What the app does concurrently: changes the list and moves its updatedAt. */
    private void concurrentAppWrite(String listId, Update change) {
        mongo.updateFirst(
                Query.query(Criteria.where("id").is(listId)),
                change.set("updatedAt", Instant.now().truncatedTo(ChronoUnit.MILLIS)),
                ShoppingList.class);
    }

    @Test
    void casMissOnce_retriesAndSucceeds_withoutCallingTheCategoryStepAgain() throws Exception {
        String user = "fp-cas-once";
        String token = token(user, ALL_SCOPES);
        ShoppingList list = seedListNeedingCategorisation(user);
        String tacos = tacos(token);
        addEntry(token, "current", "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + tacos + "\"}");
        AtomicInteger writes = new AtomicInteger();
        // First attempt only: the user checks off the milk in the app while the plan is merged.
        duringCategorize = () -> {
            if (writes.getAndIncrement() == 0) {
                concurrentAppWrite(list.getId(), new Update().set("items.1.checked", true));
            }
        };

        HttpResponse<String> res = fromPlan(token, "current", key());

        assertThat(res.body(), res.statusCode(), is(200));
        assertThat(JsonPath.read(res.body(), "$.items[?(@.id == 'e-milk')].checked"), is(List.of(true)));
        assertThat(quantity(item(res.body(), "Köttfärs")), is(closeTo(1000.0, 0.001)));
        // Same names on the retry: the category step (and its LLM call) ran once, not twice.
        assertThat(categorizeCalls.get(), is(1));
        assertThat(llmCalls(), is(2));
    }

    @Test
    void casMissThreeTimes_is412_writesNothingOfThePlan_andReleasesTheKey() throws Exception {
        String user = "fp-cas-412";
        String token = token(user, ALL_SCOPES);
        ShoppingList list = seedListNeedingCategorisation(user);
        String tacos = tacos(token);
        addEntry(token, "current", "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + tacos + "\"}");
        AtomicInteger n = new AtomicInteger();
        // Every attempt: the app adds a new line meanwhile (so the names change and the step runs again).
        duringCategorize = () -> concurrentAppWrite(
                list.getId(),
                new Update()
                        .push(
                                "items",
                                new ShoppingListItem(
                                        "app-" + n.get(), "Sak " + n.incrementAndGet(), null, null, false)));
        String k = key();

        HttpResponse<String> res = fromPlan(token, "current", k);

        assertThat(res.body(), res.statusCode(), is(412));
        assertThat(res.headers().firstValue("Content-Type").orElse(""), containsString("application/problem+json"));
        assertThat(categorizeCalls.get(), is(IntegrationShoppingListService.FROM_PLAN_ATTEMPTS));
        assertThat(llmCalls(), is(1 + IntegrationShoppingListService.FROM_PLAN_ATTEMPTS));
        ShoppingList stored = listRepository.findById(list.getId()).orElseThrow();
        assertThat(stored.getItems(), hasSize(2 + 3)); // the app's three lines, none of the plan's
        assertThat(stored.getItems().stream().noneMatch(i -> i.getName().equals("Köttfärs")), is(true));

        // The failed attempt released the key: the same key succeeds once the list is quiet.
        duringCategorize = () -> {};
        HttpResponse<String> retry = fromPlan(token, "current", k);
        assertThat(retry.body(), retry.statusCode(), is(200));
        assertThat(retry.headers().firstValue("Idempotency-Replayed").isPresent(), is(false));
    }

    @Test
    void perMinuteLimit_sixthExecutionIs429WithRetryAfter_replaysDoNotCount() throws Exception {
        String user = "fp-limit-minute";
        String token = token(user, ALL_SCOPES);
        String tacos = tacos(token);
        addEntry(token, "current", "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + tacos + "\"}");
        // The limit is per clock minute: start early in a minute so the burst stays inside one window.
        long secondOfMinute = Instant.now().getEpochSecond() % 60;
        if (secondOfMinute > 40) {
            Thread.sleep((61 - secondOfMinute) * 1000);
        }

        String firstKey = key();
        assertThat(fromPlan(token, "current", firstKey).statusCode(), is(200));
        for (int i = 2; i <= 5; i++) {
            assertThat("call " + i, fromPlan(token, "current", key()).statusCode(), is(200));
        }
        // A replay is not an execution: still 200, and it does not use up the limit.
        HttpResponse<String> replay = fromPlan(token, "current", firstKey);
        assertThat(replay.statusCode(), is(200));
        assertThat(replay.headers().firstValue("Idempotency-Replayed").orElse(null), is("true"));

        String limitedKey = key();
        HttpResponse<String> limited = fromPlan(token, "current", limitedKey);

        assertThat(limited.body(), limited.statusCode(), is(429));
        assertThat(limited.headers().firstValue("Content-Type").orElse(""), containsString("application/problem+json"));
        long retryAfter =
                Long.parseLong(limited.headers().firstValue("Retry-After").orElseThrow());
        assertThat(retryAfter >= 1 && retryAfter <= 60, is(true));
        assertThat(((Number) JsonPath.read(limited.body(), "$.retryAfterSeconds")).longValue(), is(retryAfter));
        assertThat(JsonPath.read(limited.body(), "$.code"), is(FromPlanRateLimitedException.CODE));
        // Five executions added the plan five times; the limited one wrote nothing.
        ShoppingListItem mince = activeLists(user).get(0).getItems().stream()
                .filter(i -> i.getName().equals("Köttfärs"))
                .findFirst()
                .orElseThrow();
        assertThat(mince.getQuantity(), is(closeTo(5000.0, 0.001)));
        // Another user is not affected.
        String other = token("fp-limit-minute-other", ALL_SCOPES);
        assertThat(fromPlan(other, "current", key()).statusCode(), is(422));
    }

    @Test
    void perDayLimit_is429UntilMidnight_andWritesNothing() throws Exception {
        String user = "fp-limit-day";
        String token = token(user, ALL_SCOPES);
        String tacos = tacos(token);
        addEntry(token, "current", "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + tacos + "\"}");
        ZoneId zone = ZoneId.of("Europe/Stockholm");
        LocalDate today = LocalDate.now(zone);
        // 30 executions already today (counted by the limiter's own document).
        mongo.getCollection(FromPlanRateLimiter.COLLECTION)
                .insertOne(new org.bson.Document("_id", FromPlanRateLimiter.dayKey(user, today))
                        .append("count", 30)
                        .append(
                                "expiresAt",
                                java.util.Date.from(
                                        today.plusDays(1).atStartOfDay(zone).toInstant())));

        HttpResponse<String> limited = fromPlan(token, "current", key());

        assertThat(limited.body(), limited.statusCode(), is(429));
        long retryAfter =
                Long.parseLong(limited.headers().firstValue("Retry-After").orElseThrow());
        long untilMidnight = java.time.Duration.between(
                        Instant.now(), today.plusDays(1).atStartOfDay(zone).toInstant())
                .toSeconds();
        assertThat(Math.abs(retryAfter - untilMidnight) <= 5, is(true));
        assertThat(JsonPath.read(limited.body(), "$.detail"), containsString("per day"));
        assertThat(listRepository.findAllByUserIdOrderByUpdatedAtDesc(user), hasSize(0));
        assertThat(llmCalls(), is(0));
    }

    @Test
    void aPlannedRecipeThatNoLongerExists_is400AsInTheApp_andWritesNothing() throws Exception {
        String user = "fp-gone";
        String token = token(user, ALL_SCOPES);
        String tacos = tacos(token);
        addEntry(token, "current", "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + tacos + "\"}");
        recipeRepository.deleteById(tacos);

        HttpResponse<String> res = fromPlan(token, "current", key());

        assertThat(res.body(), res.statusCode(), is(400));
        assertThat(listRepository.findAllByUserIdOrderByUpdatedAtDesc(user), hasSize(0));
        assertThat(llmCalls(), is(0));
    }

    @Test
    void badRequests_are400() throws Exception {
        String token = token("fp-bad", ALL_SCOPES);
        assertThat(fromPlan(token, "last", key()).statusCode(), is(400));
        assertThat(post(FROM_PLAN, token, "{}", key()).statusCode(), is(400));
        HttpResponse<String> noKey = post(FROM_PLAN, token, "{\"week\":\"current\"}", null);
        assertThat(noKey.statusCode(), is(400));
        assertThat(JsonPath.read(noKey.body(), "$.detail"), notNullValue());
        // "Next" is accepted case-insensitively; the week is empty -> 422, not 400.
        assertThat(fromPlan(token, "Next", key()).statusCode(), is(422));
    }
}
