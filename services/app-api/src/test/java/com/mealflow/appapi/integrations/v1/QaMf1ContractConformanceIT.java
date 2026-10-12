package com.mealflow.appapi.integrations.v1;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.appapi.shoppingLists.domain.ShoppingList;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListStatus;
import com.mealflow.appapi.shoppingLists.repository.ShoppingListRepository;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Independent QA (MF1, 2026-10-11), gate N4, updated to the agreed contract after the MF1
 * corrections: requests and guarantees taken literally from {@code
 * docs/integrations/personal-os-v1.md} / {@code personal-os-v1.openapi.yaml} (see "Changes since v1
 * draft" there, D1–D10) — the documents Personal OS's C2 connector is built from. A failure here is
 * contract drift. Also N3: unsupported method / media type / Accept must be a closed 4xx, not a 500.
 */
class QaMf1ContractConformanceIT extends IntegrationApiTestBase {

    private static final String PROBLEM_JSON = "application/problem+json";

    @Autowired
    ShoppingListRepository listRepository;

    /** A fresh user per test, so "empty week" and list filters never see another test's data. */
    private static String user(String prefix) {
        return prefix + "-" + UUID.randomUUID();
    }

    // ---------------------------------------------------------------- D1: day

    @Test
    void d1_contractExample_mealPlanEntryWithLowercaseWeekday_isAccepted_andReturnedAsThreeLetterForm()
            throws Exception {
        // personal-os-v1.md: POST /meal-plans/next/entries { "day": "tuesday", "section": "Dinner", ... }
        String token = token(user("qa-c-day"), ALL_SCOPES);
        HttpResponse<String> res = post(
                "/integrations/v1/meal-plans/next/entries",
                token,
                "{\"day\":\"tuesday\",\"section\":\"Dinner\",\"customTitle\":\"Linsgryta\",\"portions\":2}",
                key());
        assertThat(res.body(), res.statusCode(), is(201));
        assertThat(JsonPath.read(res.body(), "$.entries[0].day"), is("TUE"));
    }

    @Test
    void d1_everyDocumentedDaySpelling_isAccepted_caseInsensitively() throws Exception {
        String token = token(user("qa-c-days"), ALL_SCOPES);
        List<String[]> cases = List.of(
                new String[] {"monday", "MON"},
                new String[] {"Tuesday", "TUE"},
                new String[] {"WEDNESDAY", "WED"},
                new String[] {"thu", "THU"},
                new String[] {"FRI", "FRI"},
                new String[] {"saturday", "SAT"},
                new String[] {"Sun", "SUN"});
        for (int i = 0; i < cases.size(); i++) {
            String[] c = cases.get(i);
            HttpResponse<String> res = post(
                    "/integrations/v1/meal-plans/current/entries",
                    token,
                    "{\"day\":\"" + c[0] + "\",\"section\":\"Dinner\",\"customTitle\":\"x\"}",
                    key());
            assertThat(c[0], res.statusCode(), is(201));
            assertThat(c[0], JsonPath.read(res.body(), "$.entries[" + i + "].day"), is(c[1]));
        }
    }

    @Test
    void d1_undocumentedDaySpelling_isA400() throws Exception {
        String token = token(user("qa-c-day400"), ALL_SCOPES);
        for (String day : List.of("tues", "måndag", "1", "mondays")) {
            HttpResponse<String> res = post(
                    "/integrations/v1/meal-plans/current/entries",
                    token,
                    "{\"day\":\"" + day + "\",\"section\":\"Dinner\",\"customTitle\":\"x\"}",
                    key());
            assertThat(day, res.statusCode(), is(400));
            assertThat(day, res.headers().firstValue("Content-Type").orElse(""), startsWith(PROBLEM_JSON));
        }
    }

    // ---------------------------------------------------------------- D2/D3: ingredients

    @Test
    void d2_ingredientName_upTo80Chars_isAccepted_81IsA400() throws Exception {
        // personal-os-v1.openapi.yaml: Ingredient.name maxLength 80
        String token = token(user("qa-c-ingr"), ALL_SCOPES);
        assertThat(createRecipeWithIngredient(token, "{\"name\":\"" + "x".repeat(80) + "\"}"), is(201));
        assertThat(createRecipeWithIngredient(token, "{\"name\":\"" + "x".repeat(81) + "\"}"), is(400));
    }

    @Test
    void d3_ingredientQuantityMustBePositive_andRequiresAUnit() throws Exception {
        // personal-os-v1.openapi.yaml: quantity > 0 (or null); unit required when quantity is set
        String token = token(user("qa-c-unit"), ALL_SCOPES);
        assertThat(createRecipeWithIngredient(token, "{\"name\":\"Ägg\"}"), is(201));
        assertThat(createRecipeWithIngredient(token, "{\"name\":\"Salt\",\"unit\":\"nypa\"}"), is(201));
        assertThat(createRecipeWithIngredient(token, "{\"name\":\"Ägg\",\"quantity\":null,\"unit\":null}"), is(201));
        assertThat(createRecipeWithIngredient(token, "{\"name\":\"Ägg\",\"quantity\":2,\"unit\":\"st\"}"), is(201));
        assertThat(createRecipeWithIngredient(token, "{\"name\":\"Mjöl\",\"quantity\":0.5,\"unit\":\"dl\"}"), is(201));

        assertThat(createRecipeWithIngredient(token, "{\"name\":\"Ägg\",\"quantity\":2}"), is(400));
        assertThat(createRecipeWithIngredient(token, "{\"name\":\"Ägg\",\"quantity\":2,\"unit\":\" \"}"), is(400));
        assertThat(createRecipeWithIngredient(token, "{\"name\":\"Ägg\",\"quantity\":0,\"unit\":\"st\"}"), is(400));
        assertThat(createRecipeWithIngredient(token, "{\"name\":\"Ägg\",\"quantity\":-1,\"unit\":\"st\"}"), is(400));
    }

    private int createRecipeWithIngredient(String token, String ingredientJson) throws Exception {
        HttpResponse<String> res = post(
                "/integrations/v1/recipes",
                token,
                "{\"title\":\"Linsgryta\",\"ingredients\":[" + ingredientJson + "]}",
                key());
        if (res.statusCode() >= 400) {
            assertThat(res.headers().firstValue("Content-Type").orElse(""), startsWith(PROBLEM_JSON));
        }
        return res.statusCode();
    }

    // ---------------------------------------------------------------- D4: ETag on an empty week

    @Test
    void d4_emptyWeek_carriesETag0_andVersion0_andIfMatch0CreatesThePlan() throws Exception {
        // personal-os-v1.md: every resource response carries an ETag; an empty week is version 0
        String token = token(user("qa-c-etag"), ALL_SCOPES);
        HttpResponse<String> empty = get("/integrations/v1/meal-plans/next", token);
        assertThat(empty.statusCode(), is(200));
        assertThat(empty.body(), etag(empty), is("\"0\""));
        assertThat(((Number) JsonPath.read(empty.body(), "$.version")).longValue(), is(0L));
        assertThat(JsonPath.read(empty.body(), "$.id"), nullValue());
        // Stable: a second read of the still-empty week gives the same ETag.
        assertThat(etag(get("/integrations/v1/meal-plans/next", token)), is("\"0\""));

        // Any other version on the empty week -> 412, nothing written.
        HttpResponse<String> stale = send(
                "/integrations/v1/meal-plans/next/entries",
                token,
                "POST",
                "{\"day\":\"MON\",\"section\":\"Dinner\",\"customTitle\":\"x\"}",
                key(),
                "\"1760195000123\"");
        assertThat(stale.statusCode(), is(412));
        assertThat(etag(get("/integrations/v1/meal-plans/next", token)), is("\"0\""));

        HttpResponse<String> created = send(
                "/integrations/v1/meal-plans/next/entries",
                token,
                "POST",
                "{\"day\":\"MON\",\"section\":\"Dinner\",\"customTitle\":\"x\"}",
                key(),
                etag(empty));
        assertThat(created.body(), created.statusCode(), is(201));
        assertThat(etag(created), not(is("\"0\"")));
        assertThat("\"" + JsonPath.read(created.body(), "$.version").toString() + "\"", is(etag(created)));

        // Once the plan exists, "0" is stale.
        HttpResponse<String> nowStale = send(
                "/integrations/v1/meal-plans/next/entries",
                token,
                "POST",
                "{\"day\":\"TUE\",\"section\":\"Dinner\",\"customTitle\":\"y\"}",
                key(),
                "\"0\"");
        assertThat(nowStale.statusCode(), is(412));
    }

    // ---------------------------------------------------------------- D5/D6: 405 / 415 / 406

    @Test
    void d5_unsupportedMethod_isA405ProblemWithAllow() throws Exception {
        String token = token(user("qa-c-405"), ALL_SCOPES);
        HttpResponse<String> res = send("/integrations/v1/recipes", token, "PUT", "{\"title\":\"x\"}", key(), null);
        assertThat(res.body(), res.statusCode(), is(405));
        assertThat(res.headers().firstValue("Content-Type").orElse(""), startsWith(PROBLEM_JSON));
        assertThat(((Number) JsonPath.read(res.body(), "$.status")).intValue(), is(405));
        assertThat(res.headers().firstValue("Allow").orElse(""), allOf(containsString("GET"), containsString("POST")));
        assertThat(res.body(), not(containsStringIgnoringCase("exception")));
    }

    @Test
    void d6_unsupportedMediaType_isA415Problem() throws Exception {
        String token = token(user("qa-c-415"), ALL_SCOPES);
        HttpResponse<String> res = http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/integrations/v1/recipes"))
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", key())
                        .header("Content-Type", "text/plain")
                        .POST(HttpRequest.BodyPublishers.ofString("title=x"))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(res.body(), res.statusCode(), is(415));
        assertThat(res.headers().firstValue("Content-Type").orElse(""), startsWith(PROBLEM_JSON));
        assertThat(((Number) JsonPath.read(res.body(), "$.status")).intValue(), is(415));
        assertThat(res.body(), not(containsStringIgnoringCase("exception")));
    }

    @Test
    void d6_unacceptableAccept_isA406Problem() throws Exception {
        String token = token(user("qa-c-406"), ALL_SCOPES);
        HttpResponse<String> res = http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/integrations/v1/recipes"))
                        .header("Authorization", "Bearer " + token)
                        .header("Accept", "text/csv")
                        .GET()
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(res.body(), res.statusCode(), is(406));
        assertThat(res.headers().firstValue("Content-Type").orElse(""), startsWith(PROBLEM_JSON));
        assertThat(((Number) JsonPath.read(res.body(), "$.status")).intValue(), is(406));
    }

    // ---------------------------------------------------------------- D7: UpdateRecipe has no required fields

    @Test
    void d7_patchWithoutTitle_isAccepted_blankTitleIsA400() throws Exception {
        String token = token(user("qa-c-patch"), ALL_SCOPES);
        HttpResponse<String> created = post("/integrations/v1/recipes", token, "{\"title\":\"Tacos\"}", key());
        String id = JsonPath.read(created.body(), "$.id");

        HttpResponse<String> patched =
                send("/integrations/v1/recipes/" + id, token, "PATCH", "{\"portions\":2}", key(), null);
        assertThat(patched.body(), patched.statusCode(), is(200));
        assertThat(JsonPath.read(patched.body(), "$.title"), is("Tacos"));

        assertThat(
                send("/integrations/v1/recipes/" + id, token, "PATCH", "{}", key(), null)
                        .statusCode(),
                is(200));
        assertThat(
                send("/integrations/v1/recipes/" + id, token, "PATCH", "{\"title\":\" \"}", key(), null)
                        .statusCode(),
                is(400));
    }

    // ---------------------------------------------------------------- D8/D9: section, recipeId / customTitle

    @Test
    void d8_section_newPlanAddsIt_existingPlanRequiresOneOfItsSections() throws Exception {
        String token = token(user("qa-c-section"), ALL_SCOPES);
        HttpResponse<String> first = post(
                "/integrations/v1/meal-plans/next/entries",
                token,
                "{\"day\":\"monday\",\"section\":\"Middag\",\"customTitle\":\"Linsgryta\"}",
                key());
        assertThat(first.body(), first.statusCode(), is(201));
        assertThat(JsonPath.read(first.body(), "$.sections"), is(List.of("Breakfast", "Lunch", "Dinner", "Middag")));

        // Case-insensitive match; the plan's own spelling is stored.
        HttpResponse<String> second = post(
                "/integrations/v1/meal-plans/next/entries",
                token,
                "{\"day\":\"tuesday\",\"section\":\"middag\",\"customTitle\":\"Tacos\"}",
                key());
        assertThat(second.body(), second.statusCode(), is(201));
        assertThat(JsonPath.read(second.body(), "$.entries[1].section"), is("Middag"));

        HttpResponse<String> unknown = post(
                "/integrations/v1/meal-plans/next/entries",
                token,
                "{\"day\":\"tuesday\",\"section\":\"Kvällsmat\",\"customTitle\":\"Tacos\"}",
                key());
        assertThat(unknown.statusCode(), is(400));
        assertThat(unknown.headers().firstValue("Content-Type").orElse(""), startsWith(PROBLEM_JSON));
    }

    @Test
    void d9_exactlyOneOfRecipeIdOrCustomTitle_andUnknownRecipeIsA400() throws Exception {
        String token = token(user("qa-c-target"), ALL_SCOPES);
        String other = token(user("qa-c-target-other"), ALL_SCOPES);
        String recipeId = JsonPath.read(
                post("/integrations/v1/recipes", token, "{\"title\":\"Tacos\"}", key())
                        .body(),
                "$.id");
        String othersRecipeId = JsonPath.read(
                post("/integrations/v1/recipes", other, "{\"title\":\"Secret\"}", key())
                        .body(),
                "$.id");

        for (String body : List.of(
                "{\"day\":\"MON\",\"section\":\"Dinner\"}",
                "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + recipeId + "\",\"customTitle\":\"x\"}",
                "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"does-not-exist\"}",
                "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + othersRecipeId + "\"}")) {
            HttpResponse<String> res = post("/integrations/v1/meal-plans/current/entries", token, body, key());
            assertThat(body, res.statusCode(), is(400));
            assertThat(body, res.body(), not(containsString("Secret")));
        }
        HttpResponse<String> ok = post(
                "/integrations/v1/meal-plans/current/entries",
                token,
                "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + recipeId + "\"}",
                key());
        assertThat(ok.body(), ok.statusCode(), is(201));
        assertThat(JsonPath.read(ok.body(), "$.entries[0].title"), is("Tacos"));
    }

    // ---------------------------------------------------------------- D10: category casing, status filter

    @Test
    void d10_shoppingItemCategory_isLowerCase_andStatusFilterWorks() throws Exception {
        String userId = user("qa-c-lists");
        String token = token(userId, ALL_SCOPES);
        String active = seedList(userId, ShoppingListStatus.ACTIVE, "Vecka 41");
        seedList(userId, ShoppingListStatus.ARCHIVED, "Vecka 40");

        HttpResponse<String> added =
                post("/integrations/v1/shopping-lists/" + active + "/items", token, "{\"name\":\"Mjölk\"}", key());
        assertThat(added.body(), added.statusCode(), is(201));
        List<String> categories = JsonPath.read(added.body(), "$.items[*].category");
        assertThat(categories, everyItem(matchesPattern("produce|meat|dairy|bread|pantry|frozen|drinks|other")));

        assertThat(JsonPath.read(get("/integrations/v1/shopping-lists", token).body(), "$"), hasSize(2));
        HttpResponse<String> archived = get("/integrations/v1/shopping-lists?status=archived", token);
        assertThat(JsonPath.read(archived.body(), "$[*].title"), is(List.of("Vecka 40")));
        HttpResponse<String> activeOnly = get("/integrations/v1/shopping-lists?status=ACTIVE", token);
        assertThat(JsonPath.read(activeOnly.body(), "$[*].title"), is(List.of("Vecka 41")));
        HttpResponse<String> bad = get("/integrations/v1/shopping-lists?status=done", token);
        assertThat(bad.statusCode(), is(400));
        assertThat(bad.headers().firstValue("Content-Type").orElse(""), startsWith(PROBLEM_JSON));
    }

    private String seedList(String userId, ShoppingListStatus status, String title) {
        Instant now = Instant.now();
        return listRepository
                .save(new ShoppingList(userId, status, null, title, List.of(), now, now))
                .getId();
    }
}
