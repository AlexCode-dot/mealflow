// FILE: services/app-api/src/test/java/com/mealflow/appapi/weeklyPlans/web/WeeklyPlanControllerIT.java
package com.mealflow.appapi.weeklyPlans.web;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.repository.RecipeRepository;
import com.mealflow.appapi.support.MongoTestContainerConfig;
import com.mealflow.appapi.support.TestAccessTokenFactory;
import com.mealflow.appapi.support.TestJwtConfig;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
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
class WeeklyPlanControllerIT extends MongoTestContainerConfig {

    @LocalServerPort
    private int port;

    private final HttpClient http = HttpClient.newHttpClient();
    private final TestAccessTokenFactory tokens;
    private final RecipeRepository recipeRepository;

    @Autowired
    WeeklyPlanControllerIT(JwtEncoder encoder, RecipeRepository recipeRepository) {
        this.tokens = new TestAccessTokenFactory(encoder);
        this.recipeRepository = recipeRepository;
    }

    @Test
    void crud_shouldWork_forAuthenticatedUser() throws Exception {
        String userId = "user-1";
        String token = tokens.issue(userId);
        String recipeId = createRecipe(userId, "Veggie Tacos");

        HttpResponse<String> created = post("/api/weekly-plans", token, """
{
  "weeklyStart":"2024-12-09",
  "entries":[
    {
      "day":"TUE",
      "section":"Dinner",
      "recipeId":"%s",
      "portions":2,
      "extraItems":["Cola"]
    }
  ]
}
""".formatted(recipeId));

        assertThat(created.statusCode(), is(201));
        String planId = JsonPath.read(created.body(), "$.id");
        assertThat(planId, not(blankOrNullString()));
        assertThat(
                (Iterable<String>) JsonPath.read(created.body(), "$.sections"),
                hasItems("Breakfast", "Lunch", "Dinner"));

        HttpResponse<String> list = get("/api/weekly-plans", token);
        assertThat(list.statusCode(), is(200));
        assertThat(JsonPath.read(list.body(), "$[0].id").toString(), is(planId));

        HttpResponse<String> getOne = get("/api/weekly-plans/" + planId, token);
        assertThat(getOne.statusCode(), is(200));
        assertThat(JsonPath.read(getOne.body(), "$.weeklyStart").toString(), is("2024-12-09"));

        HttpResponse<String> patched = patch("/api/weekly-plans/" + planId, token, """
{
  "entries":[
    {
      "day":"WED",
      "section":"Lunch",
      "customTitle":"Custom item",
      "items":["Apples","Chips"]
    }
  ]
}
""");
        assertThat(patched.statusCode(), is(200));
        assertThat(JsonPath.read(patched.body(), "$.entries[0].customTitle").toString(), is("Custom item"));

        HttpResponse<String> deleted = delete("/api/weekly-plans/" + planId, token);
        assertThat(deleted.statusCode(), is(204));
    }

    @Test
    void shouldEnforceUserScoping() throws Exception {
        String tokenUser1 = tokens.issue("user-1");
        String tokenUser2 = tokens.issue("user-2");

        HttpResponse<String> created = post("/api/weekly-plans", tokenUser1, """
{
  "weeklyStart":"2024-12-09",
  "entries":[{"day":"MON","section":"Breakfast","customTitle":"Oats"}]
}
""");
        String planId = JsonPath.read(created.body(), "$.id");

        HttpResponse<String> otherUserGet = get("/api/weekly-plans/" + planId, tokenUser2);
        assertThat(otherUserGet.statusCode(), is(404));

        HttpResponse<String> otherUserDelete = delete("/api/weekly-plans/" + planId, tokenUser2);
        assertThat(otherUserDelete.statusCode(), is(404));
    }

    @Test
    void shouldReject_recipeIds_notOwnedByUser() throws Exception {
        String userId1 = "user-1";
        String userId2 = "user-2";
        String tokenUser1 = tokens.issue(userId1);
        String tokenUser2 = tokens.issue(userId2);
        String otherUsersRecipe = createRecipe(userId2, "Secret Recipe");

        HttpResponse<String> created = post("/api/weekly-plans", tokenUser1, """
{
  "weeklyStart":"2024-12-09",
  "entries":[{"day":"MON","section":"Breakfast","recipeId":"%s"}]
}
""".formatted(otherUsersRecipe));

        assertThat(created.statusCode(), is(400));
        assertThat(created.headers().firstValue("content-type").orElse(""), containsString("application/problem+json"));
    }

    @Test
    void list_shouldReject_invalidWeeklyStartParam() throws Exception {
        String token = tokens.issue("user-1");

        HttpResponse<String> res = get("/api/weekly-plans?weeklyStart=bad-date", token);
        assertThat(res.statusCode(), is(400));
        assertThat(res.headers().firstValue("content-type").orElse(""), containsString("application/problem+json"));
    }

    @Test
    void create_shouldReject_invalidDayValue() throws Exception {
        String token = tokens.issue("user-1");

        HttpResponse<String> created = post("/api/weekly-plans", token, """
{
  "weeklyStart":"2024-12-09",
  "entries":[{"day":"Mo","section":"Breakfast","customTitle":"Oats"}]
}
""");

        assertThat(created.statusCode(), is(400));
        assertThat(created.headers().firstValue("content-type").orElse(""), containsString("application/problem+json"));
    }

    @Test
    void create_shouldPersist_sections_order() throws Exception {
        String token = tokens.issue("user-1");

        HttpResponse<String> created = post("/api/weekly-plans", token, """
{
  "weeklyStart":"2024-12-09",
  "sections":["Dinner","Snack","Breakfast"],
  "entries":[]
}
""");

        assertThat(created.statusCode(), is(201));
        assertThat(
                (Iterable<String>) JsonPath.read(created.body(), "$.sections"),
                contains("Dinner", "Snack", "Breakfast"));
    }

    @Test
    void patch_shouldReject_entrySection_notInSections() throws Exception {
        String token = tokens.issue("user-1");

        HttpResponse<String> created = post("/api/weekly-plans", token, """
{
  "weeklyStart":"2024-12-09",
  "sections":["Breakfast","Lunch"],
  "entries":[{"day":"MON","section":"Breakfast","customTitle":"Oats"}]
}
""");
        String planId = JsonPath.read(created.body(), "$.id");

        HttpResponse<String> patched = patch("/api/weekly-plans/" + planId, token, """
{
  "entries":[{"day":"TUE","section":"Dinner","customTitle":"Soup"}]
}
""");

        assertThat(patched.statusCode(), is(400));
        assertThat(patched.headers().firstValue("content-type").orElse(""), containsString("application/problem+json"));
    }

    // -------------------------
    // HTTP helpers
    // -------------------------

    private String createRecipe(String userId, String title) {
        Instant now = Instant.now();
        Recipe recipe = new Recipe();
        recipe.setUserId(userId);
        recipe.setTitle(title);
        recipe.setCreatedAt(now);
        recipe.setUpdatedAt(now);
        return recipeRepository.save(recipe).getId();
    }

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
