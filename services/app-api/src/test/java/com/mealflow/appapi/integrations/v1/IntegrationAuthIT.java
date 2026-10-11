package com.mealflow.appapi.integrations.v1;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;

import com.jayway.jsonpath.JsonPath;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Token validation (aud/iss/exp/grant), chain separation and per-endpoint scope enforcement. */
class IntegrationAuthIT extends IntegrationApiTestBase {

    private static final String RECIPE_JSON = "{\"title\":\"Scoped\"}";

    @Test
    void validToken_canReadRecipes() throws Exception {
        HttpResponse<String> res = get("/integrations/v1/recipes", token("auth-ok", ALL_SCOPES));
        assertThat(res.statusCode(), is(200));
    }

    @Test
    void noToken_returns401ProblemJson() throws Exception {
        HttpResponse<String> res = get("/integrations/v1/recipes", null);
        assertThat(res.statusCode(), is(401));
        assertThat(res.headers().firstValue("Content-Type").orElse(""), containsString("application/problem+json"));
        assertThat(JsonPath.read(res.body(), "$.status"), is(401));
    }

    @Test
    void wrongAudience_returns401() throws Exception {
        String gid = seedGrant("auth-aud");
        String token = mint("auth-aud", ALL_SCOPES, gid, Map.of("aud", List.of("some-other-api")));
        assertThat(get("/integrations/v1/recipes", token).statusCode(), is(401));
    }

    @Test
    void missingAudience_returns401() throws Exception {
        String gid = seedGrant("auth-noaud");
        String token = mint("auth-noaud", ALL_SCOPES, gid, mapWithNull("aud"));
        assertThat(get("/integrations/v1/recipes", token).statusCode(), is(401));
    }

    @Test
    void firstPartyAppToken_onIntegrations_returns401() throws Exception {
        assertThat(get("/integrations/v1/recipes", firstPartyToken("auth-fp")).statusCode(), is(401));
    }

    @Test
    void integrationToken_onFirstPartyApi_returns401() throws Exception {
        String token = token("auth-cross", ALL_SCOPES);
        assertThat(get("/api/recipes", token).statusCode(), is(401));
        assertThat(get("/api/profile", token).statusCode(), is(401));
    }

    @Test
    void tokenWithOnlyClientId_onFirstPartyApi_returns401() throws Exception {
        String gid = seedGrant("auth-cid");
        String token = mint("auth-cid", ALL_SCOPES, gid, mapWithNull("aud"));
        assertThat(get("/api/recipes", token).statusCode(), is(401));
    }

    @Test
    void firstPartyToken_stillWorksOnApi() throws Exception {
        assertThat(get("/api/recipes", firstPartyToken("auth-fp-ok")).statusCode(), is(200));
    }

    @Test
    void expiredToken_returns401() throws Exception {
        String gid = seedGrant("auth-exp");
        Instant past = Instant.now().minusSeconds(600);
        String token =
                mint("auth-exp", ALL_SCOPES, gid, Map.of("iat", past, "nbf", past, "exp", past.plusSeconds(300)));
        assertThat(get("/integrations/v1/recipes", token).statusCode(), is(401));
    }

    @Test
    void wrongIssuer_returns401() throws Exception {
        String gid = seedGrant("auth-iss");
        String token = mint("auth-iss", ALL_SCOPES, gid, Map.of("iss", "https://evil.example"));
        assertThat(get("/integrations/v1/recipes", token).statusCode(), is(401));
    }

    @Test
    void unknownGrant_returns401() throws Exception {
        String token = mint("auth-nogrant", ALL_SCOPES, "grant-does-not-exist", Map.of());
        assertThat(get("/integrations/v1/recipes", token).statusCode(), is(401));
    }

    @Test
    void missingGid_returns401() throws Exception {
        seedGrant("auth-nogid");
        String token = mint("auth-nogid", ALL_SCOPES, "x", mapWithNull("gid"));
        assertThat(get("/integrations/v1/recipes", token).statusCode(), is(401));
    }

    @Test
    void revokedGrant_returns401_afterCacheExpiry() throws Exception {
        String gid = seedGrant("auth-revoke");
        String token = mint("auth-revoke", ALL_SCOPES, gid, Map.of());
        assertThat(get("/integrations/v1/recipes", token).statusCode(), is(200));

        grants.updateOne(Filters.eq("_id", gid), Updates.set("revoked", true));
        grantValidator.invalidateAll(); // simulate the <=30 s cache TTL elapsing

        assertThat(get("/integrations/v1/recipes", token).statusCode(), is(401));
    }

    @Test
    void deletedGrant_returns401() throws Exception {
        String gid = seedGrant("auth-delete");
        String token = mint("auth-delete", ALL_SCOPES, gid, Map.of());
        assertThat(get("/integrations/v1/recipes", token).statusCode(), is(200));

        grants.deleteOne(Filters.eq("_id", gid));
        grantValidator.invalidateAll();

        assertThat(get("/integrations/v1/recipes", token).statusCode(), is(401));
    }

    @Test
    void grantOfAnotherUser_returns401() throws Exception {
        String gidOfA = seedGrant("auth-owner-a");
        String token = mint("auth-owner-b", ALL_SCOPES, gidOfA, Map.of());
        assertThat(get("/integrations/v1/recipes", token).statusCode(), is(401));
    }

    @Test
    void readOnlyToken_gets403OnEveryWrite() throws Exception {
        String token = token("auth-readonly", READ_SCOPES);
        String k = key();
        List<HttpResponse<String>> writes = List.of(
                post("/integrations/v1/recipes", token, RECIPE_JSON, k),
                send("/integrations/v1/recipes/abc", token, "PATCH", RECIPE_JSON, k, null),
                post("/integrations/v1/meal-plans/current/entries", token, "{}", k),
                send("/integrations/v1/meal-plans/p1/entries/e1", token, "DELETE", null, k, null),
                post("/integrations/v1/shopping-lists/l1/items", token, "{\"name\":\"Milk\"}", k),
                send("/integrations/v1/shopping-lists/l1/items/i1", token, "PATCH", "{\"checked\":true}", k, null),
                send("/integrations/v1/shopping-lists/l1/items/i1", token, "DELETE", null, k, null));
        for (HttpResponse<String> res : writes) {
            assertThat(res.uri() + " " + res.body(), res.statusCode(), is(403));
            assertThat(res.headers().firstValue("Content-Type").orElse(""), containsString("application/problem+json"));
        }
    }

    @Test
    void tokenWithoutReadScope_gets403OnThatAreaOnly() throws Exception {
        String noRecipes = token("auth-norecipes", List.of("mealplan.read", "shoppinglist.read"));
        assertThat(get("/integrations/v1/recipes", noRecipes).statusCode(), is(403));
        assertThat(get("/integrations/v1/recipes/abc", noRecipes).statusCode(), is(403));
        assertThat(get("/integrations/v1/meal-plans/current", noRecipes).statusCode(), is(200));
        assertThat(get("/integrations/v1/shopping-lists", noRecipes).statusCode(), is(200));

        String noPlan = token("auth-noplan", List.of("recipes.read", "shoppinglist.read"));
        assertThat(get("/integrations/v1/meal-plans/current", noPlan).statusCode(), is(403));
        assertThat(get("/integrations/v1/meal-plans/next", noPlan).statusCode(), is(403));

        String noShopping = token("auth-noshop", List.of("recipes.read", "mealplan.read"));
        assertThat(get("/integrations/v1/shopping-lists", noShopping).statusCode(), is(403));
        assertThat(get("/integrations/v1/shopping-lists/l1", noShopping).statusCode(), is(403));
    }

    @Test
    void writeScopeAlone_doesNotGrantRead() throws Exception {
        String token = token("auth-writeonly", List.of("recipes.write"));
        assertThat(post("/integrations/v1/recipes", token, RECIPE_JSON, key()).statusCode(), is(201));
        assertThat(get("/integrations/v1/recipes", token).statusCode(), is(403));
    }

    @Test
    void unknownIntegrationPath_isDenied() throws Exception {
        assertThat(
                get("/integrations/v1/profile", token("auth-unknown", ALL_SCOPES))
                        .statusCode(),
                is(403));
    }

    private static Map<String, Object> mapWithNull(String claim) {
        java.util.HashMap<String, Object> map = new java.util.HashMap<>();
        map.put(claim, null);
        return map;
    }
}
