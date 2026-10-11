package com.mealflow.appapi.integrations.v1;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.appapi.recipes.repository.RecipeRepository;
import java.net.http.HttpResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class IntegrationRecipeApiIT extends IntegrationApiTestBase {

    @Autowired
    RecipeRepository recipeRepository;

    private static final String TACOS = """
{
  "title":"Veggie Tacos",
  "description":"Quick weeknight",
  "ingredients":[{"name":"Tortilla","quantity":8,"unit":"pcs"}],
  "steps":["Heat","Assemble"],
  "cookingTimeMinutes":20,
  "portions":4,
  "tags":["vego","snabbt"]
}
""";

    @Test
    void create_get_update_roundTrip_withEtags() throws Exception {
        String token = token("rec-1", ALL_SCOPES);

        HttpResponse<String> created = post("/integrations/v1/recipes", token, TACOS, key());
        assertThat(created.body(), created.statusCode(), is(201));
        String id = JsonPath.read(created.body(), "$.id");
        assertThat(created.headers().firstValue("Location").orElse(""), is("/integrations/v1/recipes/" + id));
        String etag = etag(created);
        assertThat(etag, notNullValue());
        assertThat("\"" + JsonPath.read(created.body(), "$.version").toString() + "\"", is(etag));

        HttpResponse<String> got = get("/integrations/v1/recipes/" + id, token);
        assertThat(got.statusCode(), is(200));
        assertThat(etag(got), is(etag));
        assertThat(JsonPath.read(got.body(), "$.ingredients[0].name"), is("Tortilla"));
        assertThat(JsonPath.read(got.body(), "$.tags"), containsInAnyOrder("vego", "snabbt"));

        HttpResponse<String> updated =
                send("/integrations/v1/recipes/" + id, token, "PATCH", "{\"title\":\"Fish Tacos\"}", key(), etag);
        assertThat(updated.body(), updated.statusCode(), is(200));
        assertThat(JsonPath.read(updated.body(), "$.title"), is("Fish Tacos"));
        assertThat(JsonPath.read(updated.body(), "$.description"), is("Quick weeknight"));
        assertThat(etag(updated), not(is(etag)));

        // Stale ETag -> 412, nothing changes
        HttpResponse<String> stale =
                send("/integrations/v1/recipes/" + id, token, "PATCH", "{\"title\":\"Stale\"}", key(), etag);
        assertThat(stale.statusCode(), is(412));
        assertThat(recipeRepository.findById(id).orElseThrow().getTitle(), is("Fish Tacos"));

        // Current ETag -> 200
        HttpResponse<String> current =
                send("/integrations/v1/recipes/" + id, token, "PATCH", "{\"portions\":2}", key(), etag(updated));
        assertThat(current.statusCode(), is(200));
        assertThat(JsonPath.read(current.body(), "$.portions"), is(2));
    }

    @Test
    void validationErrors_return400() throws Exception {
        String token = token("rec-val", ALL_SCOPES);
        assertThat(
                post("/integrations/v1/recipes", token, "{\"title\":\"\"}", key())
                        .statusCode(),
                is(400));
        assertThat(post("/integrations/v1/recipes", token, "{not json", key()).statusCode(), is(400));
        String id = JsonPath.read(
                post("/integrations/v1/recipes", token, TACOS, key()).body(), "$.id");
        HttpResponse<String> blank =
                send("/integrations/v1/recipes/" + id, token, "PATCH", "{\"title\":\"   \"}", key(), null);
        assertThat(blank.statusCode(), is(400));
        assertThat(get("/integrations/v1/recipes?limit=0", token).statusCode(), is(400));
        assertThat(get("/integrations/v1/recipes?cursor=%25%25%25", token).statusCode(), is(400));
    }

    @Test
    void idempotentCreate_replaysAndCreatesOnce() throws Exception {
        String token = token("rec-idem", ALL_SCOPES);
        String k = key();

        HttpResponse<String> first = post("/integrations/v1/recipes", token, TACOS, k);
        HttpResponse<String> second = post("/integrations/v1/recipes", token, TACOS, k);

        assertThat(first.statusCode(), is(201));
        assertThat(second.statusCode(), is(201));
        assertThat(second.headers().firstValue("Idempotency-Replayed").orElse(null), is("true"));
        assertThat(first.headers().firstValue("Idempotency-Replayed").isPresent(), is(false));
        assertThat(JsonPath.read(second.body(), "$.id"), is((Object) JsonPath.read(first.body(), "$.id")));
        assertThat(etag(second), is(etag(first)));
        assertThat(second.headers().firstValue("Location"), is(first.headers().firstValue("Location")));
        assertThat(recipeRepository.findAllByUserIdOrderByCreatedAtDesc("rec-idem"), hasSize(1));

        // Same key, different body -> 422
        HttpResponse<String> conflict = post("/integrations/v1/recipes", token, "{\"title\":\"Other\"}", k);
        assertThat(conflict.statusCode(), is(422));
        assertThat(recipeRepository.findAllByUserIdOrderByCreatedAtDesc("rec-idem"), hasSize(1));
    }

    @Test
    void idempotencyKeys_areScopedPerUser() throws Exception {
        String k = key();
        HttpResponse<String> a = post("/integrations/v1/recipes", token("rec-key-a", ALL_SCOPES), TACOS, k);
        HttpResponse<String> b = post("/integrations/v1/recipes", token("rec-key-b", ALL_SCOPES), TACOS, k);
        assertThat(a.statusCode(), is(201));
        assertThat(b.statusCode(), is(201));
        assertThat(b.headers().firstValue("Idempotency-Replayed").isPresent(), is(false));
        assertThat(JsonPath.read(b.body(), "$.id"), not(is((Object) JsonPath.read(a.body(), "$.id"))));
    }

    @Test
    void missingIdempotencyKey_returns400() throws Exception {
        String token = token("rec-nokey", ALL_SCOPES);
        HttpResponse<String> res = post("/integrations/v1/recipes", token, TACOS, null);
        assertThat(res.statusCode(), is(400));
        assertThat(
                JsonPath.read(res.body(), "$.detail").toString(),
                is("Idempotency-Key header is required for write requests"));
        assertThat(recipeRepository.findAllByUserIdOrderByCreatedAtDesc("rec-nokey"), hasSize(0));

        String id = JsonPath.read(
                post("/integrations/v1/recipes", token, TACOS, key()).body(), "$.id");
        assertThat(
                send("/integrations/v1/recipes/" + id, token, "PATCH", "{\"title\":\"x\"}", null, null)
                        .statusCode(),
                is(400));
    }

    @Test
    void failedWrite_releasesKey_soRetryWorks() throws Exception {
        String token = token("rec-retry", ALL_SCOPES);
        String id = JsonPath.read(
                post("/integrations/v1/recipes", token, TACOS, key()).body(), "$.id");
        String k = key();
        assertThat(
                send("/integrations/v1/recipes/" + id, token, "PATCH", "{\"title\":\"x\"}", k, "\"1\"")
                        .statusCode(),
                is(412));
        // Same key, same request is not "used up" by the failed attempt.
        assertThat(
                send("/integrations/v1/recipes/" + id, token, "PATCH", "{\"title\":\"x\"}", k, "\"1\"")
                        .statusCode(),
                is(412));
    }

    @Test
    void listAndSearch_onlyOwnRecipes_withPaging() throws Exception {
        String a = token("rec-list-a", ALL_SCOPES);
        String b = token("rec-list-b", ALL_SCOPES);
        post("/integrations/v1/recipes", a, "{\"title\":\"Pasta Carbonara\",\"tags\":[\"italian\"]}", key());
        post("/integrations/v1/recipes", a, "{\"title\":\"Lasagne\",\"tags\":[\"Italian\",\"oven\"]}", key());
        post("/integrations/v1/recipes", a, "{\"title\":\"Pad Thai\"}", key());
        post("/integrations/v1/recipes", b, "{\"title\":\"B's Italian secret\"}", key());

        HttpResponse<String> all = get("/integrations/v1/recipes", a);
        assertThat(all.statusCode(), is(200));
        assertThat(JsonPath.read(all.body(), "$.items"), hasSize(3));
        assertThat(JsonPath.read(all.body(), "$.nextCursor"), nullValue());

        HttpResponse<String> search = get("/integrations/v1/recipes?q=ITALIAN", a);
        List<String> titles = JsonPath.read(search.body(), "$.items[*].title");
        assertThat(titles, containsInAnyOrder("Pasta Carbonara", "Lasagne"));

        HttpResponse<String> byTitle = get("/integrations/v1/recipes?q=pad", a);
        assertThat(JsonPath.read(byTitle.body(), "$.items[*].title"), containsInAnyOrder("Pad Thai"));

        HttpResponse<String> regexChars = get("/integrations/v1/recipes?q=.*", a);
        assertThat(JsonPath.read(regexChars.body(), "$.items"), hasSize(0));

        HttpResponse<String> page1 = get("/integrations/v1/recipes?limit=2", a);
        assertThat(JsonPath.read(page1.body(), "$.items"), hasSize(2));
        String cursor = JsonPath.read(page1.body(), "$.nextCursor");
        assertThat(cursor, notNullValue());
        HttpResponse<String> page2 = get("/integrations/v1/recipes?limit=2&cursor=" + cursor, a);
        assertThat(JsonPath.read(page2.body(), "$.items"), hasSize(1));
        assertThat(JsonPath.read(page2.body(), "$.nextCursor"), nullValue());
    }

    @Test
    void crossUser_cannotReadOrUpdateOthersRecipe() throws Exception {
        String a = token("rec-iso-a", ALL_SCOPES);
        String b = token("rec-iso-b", ALL_SCOPES);
        HttpResponse<String> created = post("/integrations/v1/recipes", a, TACOS, key());
        String id = JsonPath.read(created.body(), "$.id");

        assertThat(get("/integrations/v1/recipes/" + id, b).statusCode(), is(404));
        HttpResponse<String> update =
                send("/integrations/v1/recipes/" + id, b, "PATCH", "{\"title\":\"Hijacked\"}", key(), null);
        assertThat(update.statusCode(), is(404));
        // Same response as a recipe that doesn't exist at all
        assertThat(get("/integrations/v1/recipes/000000000000000000000000", b).statusCode(), is(404));
        assertThat(recipeRepository.findById(id).orElseThrow().getTitle(), is("Veggie Tacos"));
        assertThat(JsonPath.read(get("/integrations/v1/recipes", b).body(), "$.items"), hasSize(0));
    }
}
