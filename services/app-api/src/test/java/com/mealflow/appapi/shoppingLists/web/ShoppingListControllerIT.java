// FILE: services/app-api/src/test/java/com/mealflow/appapi/shoppingLists/web/ShoppingListControllerIT.java
package com.mealflow.appapi.shoppingLists.web;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.appapi.recipes.domain.Ingredient;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.repository.RecipeRepository;
import com.mealflow.appapi.support.MongoTestContainerConfig;
import com.mealflow.appapi.support.TestAccessTokenFactory;
import com.mealflow.appapi.support.TestJwtConfig;
import com.mealflow.appapi.weeklyPlans.domain.PlanEntry;
import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import com.mealflow.appapi.weeklyPlans.repository.WeeklyPlanRepository;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestJwtConfig.class)
class ShoppingListControllerIT extends MongoTestContainerConfig {

    @LocalServerPort
    private int port;

    private final HttpClient http = HttpClient.newHttpClient();
    private final TestAccessTokenFactory tokens;
    private final RecipeRepository recipeRepository;
    private final WeeklyPlanRepository weeklyPlanRepository;

    @Autowired
    ShoppingListControllerIT(
            JwtEncoder encoder, RecipeRepository recipeRepository, WeeklyPlanRepository weeklyPlanRepository) {
        this.tokens = new TestAccessTokenFactory(encoder);
        this.recipeRepository = recipeRepository;
        this.weeklyPlanRepository = weeklyPlanRepository;
    }

    @Test
    void generate_shouldMergeItems_andScaleIngredients() throws Exception {
        String userId = "user-1";
        String token = tokens.issue(userId);
        String recipeId = createRecipe(userId, "Pasta", 2);
        String planId = createWeeklyPlan(userId, recipeId, 4);

        HttpResponse<String> created = post("/api/shopping-lists?mode=replace", token, """
{ "weeklyPlanId":"%s" }
""".formatted(planId));

        assertThat(created.statusCode(), is(200));
        List<String> names = JsonPath.read(created.body(), "$.items[*].name");
        assertThat(names, hasItems("Olive oil", "Basil", "Pasta", "Tomato"));

        List<Double> pastaQty =
                JsonPath.read(created.body(), "$.items[?(@.name == 'Pasta' && @.unit == 'g')].quantity");
        assertThat(pastaQty, contains(closeTo(1000.0, 0.0001)));

        List<Double> tomatoQty =
                JsonPath.read(created.body(), "$.items[?(@.name == 'Tomato' && @.unit == 'pcs')].quantity");
        assertThat(tomatoQty, contains(closeTo(4.0, 0.0001)));
    }

    @Test
    void generate_shouldUseCustomTitle_whenCustomMealHasNoItems() throws Exception {
        String userId = "user-custom-title";
        String token = tokens.issue(userId);

        Instant now = Instant.now();
        PlanEntry entry =
                new PlanEntry("entry-1", "MON", "Dinner", null, "Eggs", List.of(), List.of(), null, null);
        WeeklyPlan plan = new WeeklyPlan(
                userId,
                "2024-12-09",
                List.of(entry),
                List.of("Breakfast", "Lunch", "Dinner"),
                now,
                now);
        String planId = weeklyPlanRepository.save(plan).getId();

        HttpResponse<String> created = post("/api/shopping-lists?mode=replace", token, """
{ "weeklyPlanId":"%s" }
""".formatted(planId));

        assertThat(created.statusCode(), is(200));
        List<String> names = JsonPath.read(created.body(), "$.items[*].name");
        assertThat(names, contains("Eggs"));
    }

    @Test
    void archive_shouldCreateNewActiveList() throws Exception {
        String token = tokens.issue("user-1");

        HttpResponse<String> created = post("/api/shopping-lists", token, "{}");
        String listId = JsonPath.read(created.body(), "$.id");

        HttpResponse<String> archived = patch("/api/shopping-lists/" + listId, token, """
{ "status":"archived" }
""");
        assertThat(archived.statusCode(), is(200));

        HttpResponse<String> activeLists = get("/api/shopping-lists?status=active", token);
        assertThat(activeLists.statusCode(), is(200));
        String activeId = JsonPath.read(activeLists.body(), "$[0].id");
        assertThat(activeId, not(listId));
    }

    @Test
    void shouldEnforceUserScoping() throws Exception {
        String tokenUser1 = tokens.issue("user-1");
        String tokenUser2 = tokens.issue("user-2");

        HttpResponse<String> created = post("/api/shopping-lists", tokenUser1, "{}");
        String listId = JsonPath.read(created.body(), "$.id");

        HttpResponse<String> otherUserGet = get("/api/shopping-lists/" + listId, tokenUser2);
        assertThat(otherUserGet.statusCode(), is(404));
    }

    @Test
    void list_shouldReject_invalidStatusParam() throws Exception {
        String token = tokens.issue("user-1");

        HttpResponse<String> res = get("/api/shopping-lists?status=unknown", token);
        assertThat(res.statusCode(), is(400));
        assertThat(res.headers().firstValue("content-type").orElse(""), containsString("application/problem+json"));
    }

    @Test
    void deleteItem_shouldReturnNotFound_forMissingItem() throws Exception {
        String token = tokens.issue("user-1");

        HttpResponse<String> created = post("/api/shopping-lists", token, "{}");
        String listId = JsonPath.read(created.body(), "$.id");

        HttpResponse<String> deleted = delete("/api/shopping-lists/" + listId + "/items/missing", token);
        assertThat(deleted.statusCode(), is(404));
        assertThat(deleted.headers().firstValue("content-type").orElse(""), containsString("application/problem+json"));
    }

    // -------------------------
    // Test data helpers
    // -------------------------

    private String createRecipe(String userId, String title, int portions) {
        Instant now = Instant.now();
        Recipe recipe = new Recipe();
        recipe.setUserId(userId);
        recipe.setTitle(title);
        recipe.setIngredients(List.of(new Ingredient("Pasta", 500.0, "g"), new Ingredient("Tomato", 2.0, "pcs")));
        recipe.setPortions(portions);
        recipe.setCreatedAt(now);
        recipe.setUpdatedAt(now);
        return recipeRepository.save(recipe).getId();
    }

    private String createWeeklyPlan(String userId, String recipeId, int portions) {
        Instant now = Instant.now();
        PlanEntry entry = new PlanEntry(
                "entry-1", "MON", "Dinner", recipeId, null, List.of("Olive oil"), List.of("Basil"), null, portions);

        WeeklyPlan plan =
                new WeeklyPlan(userId, "2024-12-09", List.of(entry), List.of("Breakfast", "Lunch", "Dinner"), now, now);

        return weeklyPlanRepository.save(plan).getId();
    }

    // -------------------------
    // HTTP helpers
    // -------------------------

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private HttpResponse<String> get(String path, String token) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(uri(path))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .GET()
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String path, String token, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(uri(path))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> patch(String path, String token, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(uri(path))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .method("PATCH", HttpRequest.BodyPublishers.ofString(json))
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> delete(String path, String token) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(uri(path))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .DELETE()
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }
}
