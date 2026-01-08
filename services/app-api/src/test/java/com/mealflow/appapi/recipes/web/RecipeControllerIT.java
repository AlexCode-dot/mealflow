// FILE: services/app-api/src/test/java/com/mealflow/appapi/recipes/web/RecipeControllerIT.java
package com.mealflow.appapi.recipes.web;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.appapi.support.MongoTestContainerConfig;
import com.mealflow.appapi.support.TestAccessTokenFactory;
import com.mealflow.appapi.support.TestJwtConfig;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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
class RecipeControllerIT extends MongoTestContainerConfig {

    @LocalServerPort
    private int port;

    private final HttpClient http = HttpClient.newHttpClient();
    private final TestAccessTokenFactory tokens;

    @Autowired
    RecipeControllerIT(JwtEncoder encoder) {
        this.tokens = new TestAccessTokenFactory(encoder);
    }

    @Test
    void crud_shouldWork_forAuthenticatedUser() throws Exception {
        String token = tokens.issue("user-1");

        // CREATE
        HttpResponse<String> created = post("/api/recipes", token, """
{
  "title":"Veggie Tacos",
  "description":"High protein",
  "ingredients":[{"name":"Tortilla","quantity":2,"unit":"pcs"}],
  "steps":["Heat","Assemble"],
  "fromExternal":false
}
""");

        assertThat(created.statusCode(), is(201));
        String id = JsonPath.read(created.body(), "$.id");
        assertThat(id, not(blankOrNullString()));

        // LIST
        HttpResponse<String> list = get("/api/recipes", token);
        assertThat(list.statusCode(), is(200));
        assertThat(JsonPath.read(list.body(), "$[0].id").toString(), is(id));

        // GET
        HttpResponse<String> getOne = get("/api/recipes/" + id, token);
        assertThat(getOne.statusCode(), is(200));
        assertThat(JsonPath.read(getOne.body(), "$.title").toString(), is("Veggie Tacos"));

        // PATCH
        HttpResponse<String> patched = patch("/api/recipes/" + id, token, """
{ "title":"Veggie Tacos Updated" }
""");
        assertThat(patched.statusCode(), is(200));
        assertThat(JsonPath.read(patched.body(), "$.title").toString(), is("Veggie Tacos Updated"));

        // DELETE
        HttpResponse<String> deleted = delete("/api/recipes/" + id, token);
        assertThat(deleted.statusCode(), is(204));
    }

    @Test
    void shouldEnforceUserScoping() throws Exception {
        String tokenUser1 = tokens.issue("user-1");
        String tokenUser2 = tokens.issue("user-2");

        HttpResponse<String> created = post("/api/recipes", tokenUser1, """
{
  "title":"Secret",
  "ingredients":[{"name":"Beans","quantity":1,"unit":"pcs"}],
  "steps":["Cook"]
}
""");
        String id = JsonPath.read(created.body(), "$.id");

        HttpResponse<String> otherUserGet = get("/api/recipes/" + id, tokenUser2);
        assertThat(otherUserGet.statusCode(), is(404));

        HttpResponse<String> otherUserDelete = delete("/api/recipes/" + id, tokenUser2);
        assertThat(otherUserDelete.statusCode(), is(404));
    }

    // -------------------------
    // ✅ UX-friendly domain rules
    // -------------------------

    @Test
    void create_shouldAllow_titleOnly_andDefaultEmptyLists() throws Exception {
        String token = tokens.issue("user-1");

        HttpResponse<String> created = post("/api/recipes", token, """
{ "title":"Tacos" }
""");

        assertThat(created.statusCode(), is(201));
        assertThat(JsonPath.read(created.body(), "$.title").toString(), is("Tacos"));
        assertThat(JsonPath.read(created.body(), "$.ingredients").toString(), is("[]"));
        assertThat(JsonPath.read(created.body(), "$.steps").toString(), is("[]"));
    }

    @Test
    void create_shouldAllow_ingredientNameOnly() throws Exception {
        String token = tokens.issue("user-1");

        HttpResponse<String> created = post("/api/recipes", token, """
{
  "title":"Simple",
  "ingredients":[{"name":"Salt"}]
}
""");

        assertThat(created.statusCode(), is(201));
        assertThat(JsonPath.read(created.body(), "$.ingredients[0].name").toString(), is("Salt"));
    }

    @Test
    void create_shouldReject_ingredientQuantityWithoutUnit() throws Exception {
        String token = tokens.issue("user-1");

        HttpResponse<String> res = post("/api/recipes", token, """
{
  "title":"Bad Ingredient",
  "ingredients":[{"name":"Milk","quantity":1}]
}
""");

        assertThat(res.statusCode(), is(400));
        assertThat(res.headers().firstValue("content-type").orElse(""), containsString("application/problem+json"));
    }

    @Test
    void patch_shouldAllowClearing_ingredientsAndSteps() throws Exception {
        String token = tokens.issue("user-1");

        // Create with lists
        HttpResponse<String> created = post("/api/recipes", token, """
{
  "title":"To Clear",
  "ingredients":[{"name":"Rice","quantity":1,"unit":"cup"}],
  "steps":["Boil"]
}
""");
        assertThat(created.statusCode(), is(201));
        String id = JsonPath.read(created.body(), "$.id");

        // Clear both
        HttpResponse<String> patched = patch("/api/recipes/" + id, token, """
{ "ingredients": [], "steps": [] }
""");

        assertThat(patched.statusCode(), is(200));
        assertThat(JsonPath.read(patched.body(), "$.ingredients").toString(), is("[]"));
        assertThat(JsonPath.read(patched.body(), "$.steps").toString(), is("[]"));
    }

    @Test
    void patch_shouldReject_blankTitle_whenProvided() throws Exception {
        String token = tokens.issue("user-1");

        // Create something first
        HttpResponse<String> created = post("/api/recipes", token, """
{ "title":"Valid Title" }
""");
        assertThat(created.statusCode(), is(201));
        String id = JsonPath.read(created.body(), "$.id");

        // Try to patch with blank/whitespace title
        HttpResponse<String> patched = patch("/api/recipes/" + id, token, """
{ "title":"   " }
""");

        assertThat(patched.statusCode(), is(400));
        assertThat(patched.headers().firstValue("content-type").orElse(""), containsString("application/problem+json"));

        // Your ApiExceptionHandler puts the human message into "detail"
        assertThat(JsonPath.read(patched.body(), "$.detail").toString(), is("title must not be blank"));
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
