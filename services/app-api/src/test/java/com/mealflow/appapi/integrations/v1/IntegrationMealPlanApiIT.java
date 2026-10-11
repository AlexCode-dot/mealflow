package com.mealflow.appapi.integrations.v1;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import com.mealflow.appapi.weeklyPlans.repository.WeeklyPlanRepository;
import java.net.http.HttpResponse;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class IntegrationMealPlanApiIT extends IntegrationApiTestBase {

    @Autowired
    WeeklyPlanRepository planRepository;

    private static LocalDate currentMonday() {
        return LocalDate.now(ZoneId.of("Europe/Stockholm")).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    @Test
    void currentAndNextWeek_emptyThenAddAndRemoveEntries() throws Exception {
        String token = token("plan-1", ALL_SCOPES);
        String current = currentMonday().toString();
        String next = currentMonday().plusWeeks(1).toString();

        HttpResponse<String> empty = get("/integrations/v1/meal-plans/current", token);
        assertThat(empty.statusCode(), is(200));
        assertThat(JsonPath.read(empty.body(), "$.weekStart"), is(current));
        assertThat(JsonPath.read(empty.body(), "$.id"), nullValue());
        assertThat(JsonPath.read(empty.body(), "$.entries"), hasSize(0));
        assertThat(JsonPath.read(get("/integrations/v1/meal-plans/next", token).body(), "$.weekStart"), is(next));

        String recipeId = JsonPath.read(
                post("/integrations/v1/recipes", token, "{\"title\":\"Tacos\"}", key())
                        .body(),
                "$.id");

        HttpResponse<String> added = post(
                "/integrations/v1/meal-plans/next/entries",
                token,
                "{\"day\":\"fri\",\"section\":\"dinner\",\"recipeId\":\"" + recipeId + "\"}",
                key());
        assertThat(added.body(), added.statusCode(), is(201));
        String planId = JsonPath.read(added.body(), "$.id");
        assertThat(JsonPath.read(added.body(), "$.weekStart"), is(next));
        assertThat(JsonPath.read(added.body(), "$.entries[0].title"), is("Tacos"));
        assertThat(JsonPath.read(added.body(), "$.entries[0].day"), is("FRI"));
        String entryId = JsonPath.read(added.body(), "$.entries[0].id");
        assertThat(
                added.headers().firstValue("Location").orElse(""),
                is("/integrations/v1/meal-plans/" + planId + "/entries/" + entryId));

        HttpResponse<String> second = send(
                "/integrations/v1/meal-plans/next/entries",
                token,
                "POST",
                "{\"day\":\"SAT\",\"section\":\"Lunch\",\"customTitle\":\"Leftovers\",\"portions\":2}",
                key(),
                etag(added));
        assertThat(second.body(), second.statusCode(), is(201));
        assertThat(JsonPath.read(second.body(), "$.entries"), hasSize(2));
        assertThat(JsonPath.read(second.body(), "$.id"), is(planId));

        HttpResponse<String> nextWeek = get("/integrations/v1/meal-plans/next", token);
        assertThat(JsonPath.read(nextWeek.body(), "$.entries"), hasSize(2));
        assertThat(etag(nextWeek), is(etag(second)));
        // current week untouched
        assertThat(
                JsonPath.read(get("/integrations/v1/meal-plans/current", token).body(), "$.entries"), hasSize(0));

        // Stale If-Match on remove -> 412
        HttpResponse<String> stale = send(
                "/integrations/v1/meal-plans/" + planId + "/entries/" + entryId,
                token,
                "DELETE",
                null,
                key(),
                etag(added));
        assertThat(stale.statusCode(), is(412));

        HttpResponse<String> removed = send(
                "/integrations/v1/meal-plans/" + planId + "/entries/" + entryId,
                token,
                "DELETE",
                null,
                key(),
                etag(second));
        assertThat(removed.statusCode(), is(200));
        assertThat(JsonPath.read(removed.body(), "$.entries"), hasSize(1));
        assertThat(etag(removed), not(is(etag(second))));

        HttpResponse<String> gone = send(
                "/integrations/v1/meal-plans/" + planId + "/entries/" + entryId, token, "DELETE", null, key(), null);
        assertThat(gone.statusCode(), is(404));
    }

    @Test
    void addEntry_validation() throws Exception {
        String token = token("plan-val", ALL_SCOPES);
        String other = token("plan-val-other", ALL_SCOPES);
        String othersRecipe = JsonPath.read(
                post("/integrations/v1/recipes", other, "{\"title\":\"Not yours\"}", key())
                        .body(),
                "$.id");

        assertThat(
                post(
                                "/integrations/v1/meal-plans/current/entries",
                                token,
                                "{\"day\":\"XYZ\",\"section\":\"Dinner\",\"customTitle\":\"a\"}",
                                key())
                        .statusCode(),
                is(400));
        assertThat(
                post(
                                "/integrations/v1/meal-plans/current/entries",
                                token,
                                "{\"day\":\"MON\",\"section\":\"Dinner\"}",
                                key())
                        .statusCode(),
                is(400));
        HttpResponse<String> foreign = post(
                "/integrations/v1/meal-plans/current/entries",
                token,
                "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + othersRecipe + "\"}",
                key());
        assertThat(foreign.statusCode(), is(400));
        assertThat(get("/integrations/v1/meal-plans/last", token).statusCode(), is(404));
        assertThat(
                post(
                                "/integrations/v1/meal-plans/current/entries",
                                token,
                                "{\"day\":\"MON\",\"section\":\"Dinner\",\"customTitle\":\"a\"}",
                                null)
                        .statusCode(),
                is(400));
    }

    @Test
    void idempotentAddEntry_addsOnce() throws Exception {
        String token = token("plan-idem", ALL_SCOPES);
        String body = "{\"day\":\"MON\",\"section\":\"Dinner\",\"customTitle\":\"Soup\"}";
        String k = key();
        HttpResponse<String> first = post("/integrations/v1/meal-plans/current/entries", token, body, k);
        HttpResponse<String> replay = post("/integrations/v1/meal-plans/current/entries", token, body, k);
        assertThat(first.statusCode(), is(201));
        assertThat(replay.statusCode(), is(201));
        assertThat(replay.headers().firstValue("Idempotency-Replayed").orElse(null), is("true"));
        assertThat(
                JsonPath.read(get("/integrations/v1/meal-plans/current", token).body(), "$.entries"), hasSize(1));
    }

    @Test
    void crossUser_cannotSeeOrRemoveOthersEntries() throws Exception {
        String a = token("plan-iso-a", ALL_SCOPES);
        String b = token("plan-iso-b", ALL_SCOPES);
        HttpResponse<String> added = post(
                "/integrations/v1/meal-plans/current/entries",
                a,
                "{\"day\":\"MON\",\"section\":\"Dinner\",\"customTitle\":\"A's dinner\"}",
                key());
        String planId = JsonPath.read(added.body(), "$.id");
        String entryId = JsonPath.read(added.body(), "$.entries[0].id");

        assertThat(JsonPath.read(get("/integrations/v1/meal-plans/current", b).body(), "$.entries"), hasSize(0));
        HttpResponse<String> removal =
                send("/integrations/v1/meal-plans/" + planId + "/entries/" + entryId, b, "DELETE", null, key(), null);
        assertThat(removal.statusCode(), is(404));
        WeeklyPlan stored = planRepository.findById(planId).orElseThrow();
        assertThat(stored.getEntries(), hasSize(1));
    }
}
