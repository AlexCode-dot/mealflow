package com.mealflow.appapi.integrations.v1;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.appapi.shoppingLists.domain.ShoppingList;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListItem;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListStatus;
import com.mealflow.appapi.shoppingLists.repository.ShoppingListRepository;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/**
 * Independent QA (MF1, 2026-10-11): adversarial checks on the /integrations/v1 resource server
 * that the author's suites do not already pin down — forged/unsigned tokens, path tricks around
 * the scope matchers, cross-user writes, idempotency key reuse across endpoints, stale If-Match on
 * every write family, and closed error bodies.
 */
class QaMf1IntegrationAdversarialIT extends IntegrationApiTestBase {

    private static final String RECIPE_JSON = "{\"title\":\"QA soup\",\"ingredients\":[],\"steps\":[\"Boil\"]}";

    @Autowired
    ShoppingListRepository listRepository;

    // ---------------------------------------------------------------- N3: token validation

    @Test
    void unsignedAlgNoneToken_isRejected() throws Exception {
        String gid = seedGrant("qa-none");
        String header = b64("{\"alg\":\"none\",\"typ\":\"JWT\"}");
        long now = Instant.now().getEpochSecond();
        String payload = b64("{\"iss\":\"" + issuer + "\",\"sub\":\"qa-none\",\"aud\":[\"mealflow-integrations\"],"
                + "\"client_id\":\"personal-os\",\"gid\":\"" + gid + "\",\"scope\":[\"recipes.read\"],"
                + "\"iat\":" + now + ",\"exp\":" + (now + 300) + "}");
        assertThat(get("/integrations/v1/recipes", header + "." + payload + ".").statusCode(), is(401));
    }

    @Test
    void tokenSignedWithForeignKey_isRejected() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048);
        var kp = kpg.generateKeyPair();
        RSAKey rsa = new RSAKey.Builder((RSAPublicKey) kp.getPublic())
                .privateKey((RSAPrivateKey) kp.getPrivate())
                .keyID("test-kid") // same kid as the trusted key
                .build();
        NimbusJwtEncoder attacker = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(rsa)));
        String gid = seedGrant("qa-forged");
        Instant now = Instant.now();
        String forged = attacker.encode(JwtEncoderParameters.from(JwtClaimsSet.builder()
                        .issuer(issuer)
                        .subject("qa-forged")
                        .audience(List.of("mealflow-integrations"))
                        .issuedAt(now)
                        .expiresAt(now.plusSeconds(300))
                        .claim("client_id", "personal-os")
                        .claim("gid", gid)
                        .claim("scope", ALL_SCOPES)
                        .build()))
                .getTokenValue();
        assertThat(get("/integrations/v1/recipes", forged).statusCode(), is(401));
    }

    @Test
    void notYetValidToken_isRejected() throws Exception {
        String gid = seedGrant("qa-nbf");
        String token =
                mint("qa-nbf", READ_SCOPES, gid, Map.of("nbf", Instant.now().plusSeconds(600), "iat", Instant.now()));
        assertThat(get("/integrations/v1/recipes", token).statusCode(), is(401));
    }

    @Test
    void audienceWithExtraValues_stillNeedsIntegrationsAudience_andTokenInQueryIsIgnored() throws Exception {
        String gid = seedGrant("qa-aud");
        String other = mint("qa-aud", READ_SCOPES, gid, Map.of("aud", List.of("mealflow-app", "other")));
        assertThat(get("/integrations/v1/recipes", other).statusCode(), is(401));

        // A token in the query string must not authenticate (only the Authorization header).
        String good = mint("qa-aud", READ_SCOPES, gid, Map.of());
        assertThat(get("/integrations/v1/recipes?access_token=" + good, null).statusCode(), is(401));
    }

    // ---------------------------------------------------------------- N3: scope matcher bypass attempts

    @Test
    void readOnlyToken_cannotWriteThroughPathVariants() throws Exception {
        String token = token("qa-paths", READ_SCOPES);
        String[] paths = {
            "/integrations/v1/recipes/",
            "/integrations/v1//recipes",
            "/integrations/v1/recipes/../recipes",
            "/integrations/v1/recipes;x=1",
            "/integrations/v1/RECIPES",
            "/integrations/v1/%72ecipes",
        };
        for (String path : paths) {
            HttpResponse<String> res = post(path, token, RECIPE_JSON, key());
            assertThat(
                    path + " -> " + res.statusCode() + " " + res.body(),
                    res.statusCode(),
                    not(either(is(200)).or(is(201))));
            assertThat(path, res.statusCode(), greaterThanOrEqualTo(400));
        }
        HttpResponse<String> put = send("/integrations/v1/recipes/abc", token, "PUT", RECIPE_JSON, key(), null);
        assertThat(put.statusCode(), is(403));
        HttpResponse<String> del = send("/integrations/v1/recipes/abc", token, "DELETE", null, key(), null);
        assertThat(del.statusCode(), is(403));
    }

    @Test
    void writeScopeOfOneArea_doesNotWriteAnother() throws Exception {
        String token = token("qa-area", List.of("recipes.read", "recipes.write"));
        String listId = seedList("qa-area");
        HttpResponse<String> res =
                post("/integrations/v1/shopping-lists/" + listId + "/items", token, "{\"name\":\"Milk\"}", key());
        assertThat(res.statusCode(), is(403));
        res = post(
                "/integrations/v1/meal-plans/current/entries",
                token,
                "{\"day\":\"MON\",\"section\":\"Dinner\",\"customTitle\":\"x\"}",
                key());
        assertThat(res.statusCode(), is(403));
    }

    // ---------------------------------------------------------------- N3: cross-user isolation on writes

    @Test
    void otherUsersShoppingList_cannotBeModified_andIsNotDisclosed() throws Exception {
        String aliceList = seedList("qa-alice");
        String bob = token("qa-bob", ALL_SCOPES);
        String base = "/integrations/v1/shopping-lists/" + aliceList;

        assertThat(get(base, bob).statusCode(), is(404));
        assertThat(post(base + "/items", bob, "{\"name\":\"Evil\"}", key()).statusCode(), is(404));
        assertThat(
                send(base + "/items/item-1", bob, "PATCH", "{\"checked\":true}", key(), null)
                        .statusCode(),
                is(404));
        assertThat(
                send(base + "/items/item-1", bob, "DELETE", null, key(), null).statusCode(), is(404));

        ShoppingList after = listRepository.findById(aliceList).orElseThrow();
        assertThat(after.getItems(), hasSize(1));
        assertThat(after.getItems().get(0).isChecked(), is(false));
    }

    @Test
    void mealPlanEntry_cannotReferenceOrRemoveAnotherUsersData() throws Exception {
        String alice = token("qa-mp-alice", ALL_SCOPES);
        String bob = token("qa-mp-bob", ALL_SCOPES);

        HttpResponse<String> recipe = post("/integrations/v1/recipes", alice, RECIPE_JSON, key());
        assertThat(recipe.body(), recipe.statusCode(), is(201));
        String aliceRecipeId = JsonPath.read(recipe.body(), "$.id");

        HttpResponse<String> added = post(
                "/integrations/v1/meal-plans/current/entries",
                alice,
                "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + aliceRecipeId + "\"}",
                key());
        assertThat(added.body(), added.statusCode(), is(201));
        String planId = JsonPath.read(added.body(), "$.id");
        String entryId = JsonPath.read(added.body(), "$.entries[0].id");

        // Bob may not plan Alice's recipe, nor remove Alice's entry by id.
        HttpResponse<String> steal = post(
                "/integrations/v1/meal-plans/current/entries",
                bob,
                "{\"day\":\"MON\",\"section\":\"Dinner\",\"recipeId\":\"" + aliceRecipeId + "\"}",
                key());
        assertThat(steal.statusCode(), is(400));
        assertThat(steal.body(), not(containsString("QA soup")));
        HttpResponse<String> remove =
                send("/integrations/v1/meal-plans/" + planId + "/entries/" + entryId, bob, "DELETE", null, key(), null);
        assertThat(remove.statusCode(), is(404));

        HttpResponse<String> still = get("/integrations/v1/meal-plans/current", alice);
        assertThat(JsonPath.read(still.body(), "$.entries"), hasSize(1));
    }

    // ---------------------------------------------------------------- N3: idempotency + If-Match

    @Test
    void sameIdempotencyKey_onADifferentEndpoint_is422_andDoesNotReplayTheFirstResponse() throws Exception {
        String token = token("qa-idem", ALL_SCOPES);
        String listId = seedList("qa-idem");
        String k = key();
        HttpResponse<String> first = post("/integrations/v1/recipes", token, RECIPE_JSON, k);
        assertThat(first.statusCode(), is(201));

        HttpResponse<String> other =
                post("/integrations/v1/shopping-lists/" + listId + "/items", token, "{\"name\":\"Milk\"}", k);
        assertThat(other.statusCode(), is(422));
        assertThat(other.headers().firstValue("Idempotency-Replayed").isPresent(), is(false));
        assertThat(listRepository.findById(listId).orElseThrow().getItems(), hasSize(1));
    }

    @Test
    void sameKeyAfterReconnect_newGrantSameUser_stillReplaysInsteadOfDuplicating() throws Exception {
        String k = key();
        String first = token("qa-reconnect", ALL_SCOPES);
        HttpResponse<String> a = post("/integrations/v1/recipes", first, RECIPE_JSON, k);
        assertThat(a.statusCode(), is(201));
        String second = token("qa-reconnect", ALL_SCOPES); // new grant id, same user + client
        HttpResponse<String> b = post("/integrations/v1/recipes", second, RECIPE_JSON, k);
        assertThat(b.statusCode(), is(201));
        assertThat(b.headers().firstValue("Idempotency-Replayed").orElse(""), is("true"));
        assertThat(JsonPath.read(b.body(), "$.id"), is((Object) JsonPath.read(a.body(), "$.id")));
        assertThat(JsonPath.read(get("/integrations/v1/recipes", second).body(), "$.items"), hasSize(1));
    }

    @Test
    void staleIfMatch_is412_onEveryWriteFamily_andChangesNothing() throws Exception {
        String token = token("qa-412", ALL_SCOPES);
        String stale = "\"1\"";

        HttpResponse<String> recipe = post("/integrations/v1/recipes", token, RECIPE_JSON, key());
        String recipeId = JsonPath.read(recipe.body(), "$.id");
        HttpResponse<String> patch =
                send("/integrations/v1/recipes/" + recipeId, token, "PATCH", "{\"title\":\"Changed\"}", key(), stale);
        assertThat(patch.statusCode(), is(412));
        assertThat(
                JsonPath.read(get("/integrations/v1/recipes/" + recipeId, token).body(), "$.title"), is("QA soup"));

        String listId = seedList("qa-412");
        String listBase = "/integrations/v1/shopping-lists/" + listId;
        assertThat(
                send(listBase + "/items", token, "POST", "{\"name\":\"Milk\"}", key(), stale)
                        .statusCode(),
                is(412));
        assertThat(
                send(listBase + "/items/item-1", token, "PATCH", "{\"checked\":true}", key(), stale)
                        .statusCode(),
                is(412));
        assertThat(
                send(listBase + "/items/item-1", token, "DELETE", null, key(), stale)
                        .statusCode(),
                is(412));
        assertThat(
                listRepository.findById(listId).orElseThrow().getItems().get(0).isChecked(), is(false));

        HttpResponse<String> entry = post(
                "/integrations/v1/meal-plans/current/entries",
                token,
                "{\"day\":\"MON\",\"section\":\"Dinner\",\"customTitle\":\"Tacos\"}",
                key());
        assertThat(entry.body(), entry.statusCode(), is(201));
        String planId = JsonPath.read(entry.body(), "$.id");
        String entryId = JsonPath.read(entry.body(), "$.entries[0].id");
        assertThat(
                send(
                                "/integrations/v1/meal-plans/" + planId + "/entries/" + entryId,
                                token,
                                "DELETE",
                                null,
                                key(),
                                stale)
                        .statusCode(),
                is(412));
        assertThat(
                send(
                                "/integrations/v1/meal-plans/current/entries",
                                token,
                                "POST",
                                "{\"day\":\"TUE\",\"section\":\"Dinner\",\"customTitle\":\"Pizza\"}",
                                key(),
                                stale)
                        .statusCode(),
                is(412));
        assertThat(
                JsonPath.read(get("/integrations/v1/meal-plans/current", token).body(), "$.entries"), hasSize(1));
    }

    // ---------------------------------------------------------------- N3: closed errors, no extra data

    @Test
    void errorBodies_areProblemJson_withoutInternals() throws Exception {
        String token = token("qa-err", ALL_SCOPES);
        List<HttpResponse<String>> responses = List.of(
                post("/integrations/v1/recipes", token, "{not json", key()),
                post("/integrations/v1/recipes", token, "{\"title\":\"" + "x".repeat(5000) + "\"}", key()),
                post("/integrations/v1/recipes", token, "{\"title\":\"t\",\"portions\":\"many\"}", key()),
                get("/integrations/v1/recipes/" + "%24where", token),
                get("/integrations/v1/recipes?limit=-5&cursor=%7Bbad", token),
                get("/integrations/v1/meal-plans/1999-W99", token),
                get("/integrations/v1/shopping-lists/" + UUID.randomUUID(), token),
                get("/integrations/v1/recipes", "garbage.token.value"));
        for (HttpResponse<String> res : responses) {
            String ctx = res.statusCode() + " " + res.body();
            assertThat(ctx, res.statusCode(), allOf(greaterThanOrEqualTo(400), lessThan(500)));
            assertThat(ctx, res.body(), not(containsString("Exception")));
            assertThat(ctx, res.body(), not(containsString("com.mealflow")));
            assertThat(ctx, res.body(), not(containsString("org.springframework")));
            assertThat(ctx, res.body(), not(containsString("\tat ")));
            assertThat(ctx, res.body(), not(containsStringIgnoringCase("mongo")));
        }
    }

    @Test
    void responses_doNotExposeOwnerIds() throws Exception {
        String token = token("qa-owner-secret-id", ALL_SCOPES);
        HttpResponse<String> created = post("/integrations/v1/recipes", token, RECIPE_JSON, key());
        String id = JsonPath.read(created.body(), "$.id");
        String listId = seedList("qa-owner-secret-id");
        for (HttpResponse<String> res : List.of(
                created,
                get("/integrations/v1/recipes/" + id, token),
                get("/integrations/v1/recipes", token),
                get("/integrations/v1/shopping-lists", token),
                get("/integrations/v1/shopping-lists/" + listId, token),
                get("/integrations/v1/meal-plans/current", token))) {
            assertThat(res.body(), res.statusCode(), is(either(is(200)).or(is(201))));
            assertThat(res.body(), not(containsString("qa-owner-secret-id")));
            assertThat(res.body(), not(containsString("userId")));
        }
    }

    // ---------------------------------------------------------------- helpers

    private String seedList(String userId) {
        Instant now = Instant.now();
        return listRepository
                .save(new ShoppingList(
                        userId,
                        ShoppingListStatus.ACTIVE,
                        null,
                        "QA list",
                        List.of(new ShoppingListItem("item-1", "Eggs", 12.0, "pcs", false)),
                        now,
                        now))
                .getId();
    }

    private static String b64(String json) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }
}
