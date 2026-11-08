package com.mealflow.appapi.integrations.v1;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.appapi.weeklyPlans.domain.PlanEntry;
import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import com.mealflow.appapi.weeklyPlans.repository.WeeklyPlanRepository;
import java.net.http.HttpResponse;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** MF4: {@code PATCH /integrations/v1/meal-plans/{planId}/entries/{entryId}} and the entry's items in the DTO. */
class IntegrationMealPlanMoveApiIT extends IntegrationApiTestBase {

    @Autowired
    WeeklyPlanRepository planRepository;

    /** A plan in the current week: Tacos (recipe, 2 portions, notes) on MON Dinner, Leftovers on TUE Lunch. */
    private record Planned(String token, String planId, String tacosId, String recipeId, String etag) {}

    private Planned plan(String user) throws Exception {
        String token = token(user, ALL_SCOPES);
        String recipeId = JsonPath.read(
                post("/integrations/v1/recipes", token, "{\"title\":\"Tacos\"}", key())
                        .body(),
                "$.id");
        HttpResponse<String> first = post(
                "/integrations/v1/meal-plans/current/entries",
                token,
                "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + recipeId
                        + "\",\"portions\":2,\"notes\":\"extra ost\"}",
                key());
        assertThat(first.body(), first.statusCode(), is(201));
        HttpResponse<String> second = post(
                "/integrations/v1/meal-plans/current/entries",
                token,
                "{\"day\":\"TUE\",\"section\":\"Lunch\",\"customTitle\":\"Leftovers\"}",
                key());
        assertThat(second.body(), second.statusCode(), is(201));
        return new Planned(
                token,
                JsonPath.read(first.body(), "$.id"),
                JsonPath.read(first.body(), "$.entries[0].id"),
                recipeId,
                etag(second));
    }

    private HttpResponse<String> move(Planned p, String entryId, String json, String ifMatch) throws Exception {
        return move(p.token(), p.planId(), entryId, json, key(), ifMatch);
    }

    private HttpResponse<String> move(
            String token, String planId, String entryId, String json, String idempotencyKey, String ifMatch)
            throws Exception {
        return send(
                "/integrations/v1/meal-plans/" + planId + "/entries/" + entryId,
                token,
                "PATCH",
                json,
                idempotencyKey,
                ifMatch);
    }

    private static void assertUnchangedButMoved(String body, Planned p, String day, String section) {
        String at = "$.entries[?(@.id == '" + p.tacosId() + "')]";
        assertThat(JsonPath.read(body, at + ".day"), is(List.of(day)));
        assertThat(JsonPath.read(body, at + ".section"), is(List.of(section)));
        assertThat(JsonPath.read(body, at + ".recipeId"), is(List.of(p.recipeId())));
        assertThat(JsonPath.read(body, at + ".title"), is(List.of("Tacos")));
        assertThat(JsonPath.read(body, at + ".portions"), is(List.of(2)));
        assertThat(JsonPath.read(body, at + ".notes"), is(List.of("extra ost")));
        // Still the first entry; the other entry untouched.
        assertThat(JsonPath.read(body, "$.entries[0].id"), is(p.tacosId()));
        assertThat(JsonPath.read(body, "$.entries"), hasSize(2));
        assertThat(JsonPath.read(body, "$.entries[1].day"), is("TUE"));
        assertThat(JsonPath.read(body, "$.entries[1].section"), is("Lunch"));
    }

    @Test
    void moveDay_keepsEverythingElse_andReturnsThePlanWithANewEtag() throws Exception {
        Planned p = plan("move-day");

        HttpResponse<String> res = move(p, p.tacosId(), "{\"day\":\"thursday\"}", p.etag());

        assertThat(res.body(), res.statusCode(), is(200));
        assertThat(JsonPath.read(res.body(), "$.id"), is(p.planId()));
        assertUnchangedButMoved(res.body(), p, "THU", "Dinner");
        long version = ((Number) JsonPath.read(res.body(), "$.version")).longValue();
        assertThat(etag(res), is("\"" + version + "\""));
        assertThat(etag(res), not(is(p.etag())));

        HttpResponse<String> current = get("/integrations/v1/meal-plans/current", p.token());
        assertThat(etag(current), is(etag(res)));
        assertUnchangedButMoved(current.body(), p, "THU", "Dinner");
    }

    @Test
    void moveSection_usesThePlansSpelling() throws Exception {
        Planned p = plan("move-section");

        HttpResponse<String> res = move(p, p.tacosId(), "{\"section\":\"lunch\"}", p.etag());

        assertThat(res.body(), res.statusCode(), is(200));
        assertUnchangedButMoved(res.body(), p, "MON", "Lunch");
    }

    @Test
    void moveDayAndSection_andReplayReturnsTheFirstResponse() throws Exception {
        Planned p = plan("move-both");
        String k = key();

        HttpResponse<String> res =
                move(p.token(), p.planId(), p.tacosId(), "{\"day\":\"FRI\",\"section\":\"Breakfast\"}", k, p.etag());
        assertThat(res.body(), res.statusCode(), is(200));
        assertUnchangedButMoved(res.body(), p, "FRI", "Breakfast");

        HttpResponse<String> replay =
                move(p.token(), p.planId(), p.tacosId(), "{\"day\":\"FRI\",\"section\":\"Breakfast\"}", k, p.etag());
        assertThat(replay.statusCode(), is(200));
        assertThat(replay.body(), is(res.body()));
        assertThat(etag(replay), is(etag(res)));
        assertThat(replay.headers().firstValue("Idempotency-Replayed").orElse(null), is("true"));
        assertThat(etag(get("/integrations/v1/meal-plans/current", p.token())), is(etag(res)));

        // Moving it where it already is writes nothing: same ETag.
        HttpResponse<String> noop = move(p, p.tacosId(), "{\"day\":\"fri\"}", etag(res));
        assertThat(noop.statusCode(), is(200));
        assertThat(etag(noop), is(etag(res)));
    }

    @Test
    void staleEtag_is412_andWritesNothing() throws Exception {
        Planned p = plan("move-stale");

        HttpResponse<String> res = move(p, p.tacosId(), "{\"day\":\"WED\"}", "\"1\"");

        assertThat(res.statusCode(), is(412));
        assertThat(res.headers().firstValue("Content-Type").orElse(""), containsString("application/problem+json"));
        HttpResponse<String> current = get("/integrations/v1/meal-plans/current", p.token());
        assertThat(etag(current), is(p.etag()));
        assertThat(JsonPath.read(current.body(), "$.entries[0].day"), is("MON"));
    }

    @Test
    void anotherUsersEntry_andAnUnknownEntry_are404_andWriteNothing() throws Exception {
        Planned p = plan("move-owner");
        String intruder = token("move-intruder", ALL_SCOPES);

        HttpResponse<String> foreign = move(intruder, p.planId(), p.tacosId(), "{\"day\":\"SUN\"}", key(), null);
        assertThat(foreign.statusCode(), is(404));
        HttpResponse<String> foreignWithEtag =
                move(intruder, p.planId(), p.tacosId(), "{\"day\":\"SUN\"}", key(), p.etag());
        assertThat(foreignWithEtag.statusCode(), is(404));

        HttpResponse<String> unknownEntry = move(p, "no-such-entry", "{\"day\":\"SUN\"}", p.etag());
        assertThat(unknownEntry.statusCode(), is(404));
        HttpResponse<String> unknownPlan =
                move(p.token(), "no-such-plan", p.tacosId(), "{\"day\":\"SUN\"}", key(), null);
        assertThat(unknownPlan.statusCode(), is(404));

        HttpResponse<String> current = get("/integrations/v1/meal-plans/current", p.token());
        assertThat(etag(current), is(p.etag()));
        assertThat(JsonPath.read(current.body(), "$.entries[0].day"), is("MON"));
    }

    @Test
    void validation_unknownSectionIs422_badDayOrEmptyBodyIs400_wrongScopeIs403() throws Exception {
        Planned p = plan("move-validation");

        HttpResponse<String> section = move(p, p.tacosId(), "{\"section\":\"Middag\"}", p.etag());
        assertThat(section.statusCode(), is(422));
        assertThat(JsonPath.read(section.body(), "$.code"), is("unknown_section"));
        assertThat(JsonPath.read(section.body(), "$.detail"), containsString("Breakfast, Lunch, Dinner"));

        assertThat(move(p, p.tacosId(), "{\"day\":\"someday\"}", p.etag()).statusCode(), is(400));
        assertThat(move(p, p.tacosId(), "{}", p.etag()).statusCode(), is(400));
        assertThat(move(p, p.tacosId(), "{\"section\":\" \"}", p.etag()).statusCode(), is(400));
        assertThat(
                move(p.token(), p.planId(), p.tacosId(), "{\"day\":\"WED\"}", null, p.etag())
                        .statusCode(),
                is(400));

        String readOnly = token("move-validation", READ_SCOPES);
        HttpResponse<String> forbidden = move(readOnly, p.planId(), p.tacosId(), "{\"day\":\"WED\"}", key(), null);
        assertThat(forbidden.statusCode(), is(403));

        assertThat(etag(get("/integrations/v1/meal-plans/current", p.token())), is(p.etag()));
    }

    @Test
    void entryDto_carriesItemsAndExtraItems_readOnly() throws Exception {
        String user = "dto-items";
        String token = token(user, ALL_SCOPES);
        String monday = LocalDate.now(ZoneId.of("Europe/Stockholm"))
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .toString();
        Instant at = Instant.now().minusSeconds(60).truncatedTo(ChronoUnit.MILLIS);
        planRepository.save(new WeeklyPlan(
                user,
                monday,
                List.of(
                        new PlanEntry(
                                "e-1",
                                "WED",
                                "Dinner",
                                null,
                                "Tacos",
                                List.of("Tortillas", "Köttfärs"),
                                List.of("Lime"),
                                null,
                                4),
                        new PlanEntry("e-2", "THU", "Dinner", null, "Soppa", null, null, null, null)),
                List.of("Breakfast", "Lunch", "Dinner"),
                at,
                at));

        HttpResponse<String> current = get("/integrations/v1/meal-plans/current", token);

        assertThat(current.statusCode(), is(200));
        assertThat(JsonPath.read(current.body(), "$.entries[0].items"), is(List.of("Tortillas", "Köttfärs")));
        assertThat(JsonPath.read(current.body(), "$.entries[0].extraItems"), is(List.of("Lime")));
        // Never null: an entry without items has empty lists.
        assertThat(JsonPath.read(current.body(), "$.entries[1].items"), hasSize(0));
        assertThat(JsonPath.read(current.body(), "$.entries[1].extraItems"), hasSize(0));
        // The existing fields are unchanged.
        assertThat(JsonPath.read(current.body(), "$.entries[0].title"), is("Tacos"));
        assertThat(JsonPath.read(current.body(), "$.entries[0].portions"), is(4));

        // Moving an entry keeps its items.
        String planId = JsonPath.read(current.body(), "$.id");
        HttpResponse<String> moved = move(token, planId, "e-1", "{\"day\":\"SAT\"}", key(), etag(current));
        assertThat(moved.body(), moved.statusCode(), is(200));
        assertThat(JsonPath.read(moved.body(), "$.entries[0].items"), is(List.of("Tortillas", "Köttfärs")));
        assertThat(JsonPath.read(moved.body(), "$.entries[0].extraItems"), is(List.of("Lime")));

        // Read-only: the add-entry body has no items, so an extra field is simply ignored or rejected,
        // and either way nothing lands in items.
        HttpResponse<String> added = post(
                "/integrations/v1/meal-plans/next/entries",
                token,
                "{\"day\":\"MON\",\"section\":\"Dinner\",\"customTitle\":\"Pizza\",\"items\":[\"Ost\"]}",
                key());
        if (added.statusCode() == 201) {
            assertThat(JsonPath.read(added.body(), "$.entries[0].items"), hasSize(0));
        } else {
            assertThat(added.statusCode(), is(400));
        }
    }
}
