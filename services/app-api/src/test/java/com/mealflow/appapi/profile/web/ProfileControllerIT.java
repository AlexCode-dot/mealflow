// FILE: services/app-api/src/test/java/com/mealflow/appapi/profile/web/ProfileControllerIT.java
package com.mealflow.appapi.profile.web;

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
class ProfileControllerIT extends MongoTestContainerConfig {

    @LocalServerPort
    private int port;

    private final HttpClient http = HttpClient.newHttpClient();
    private final TestAccessTokenFactory tokens;

    @Autowired
    ProfileControllerIT(JwtEncoder encoder) {
        this.tokens = new TestAccessTokenFactory(encoder);
    }

    @Test
    void get_shouldCreateDefaultProfile() throws Exception {
        String token = tokens.issue("user-1");

        HttpResponse<String> res = get("/api/profile", token);
        assertThat(res.statusCode(), is(200));
        assertThat(JsonPath.read(res.body(), "$.id"), notNullValue());
        assertThat(JsonPath.read(res.body(), "$.displayName"), nullValue());
        assertThat(JsonPath.read(res.body(), "$.theme"), nullValue());
        assertThat(JsonPath.read(res.body(), "$.createdAt"), notNullValue());
        assertThat(JsonPath.read(res.body(), "$.updatedAt"), notNullValue());
    }

    @Test
    void patch_shouldUpdateProfile() throws Exception {
        String token = tokens.issue("user-1");

        HttpResponse<String> res = patch("/api/profile", token, """
{ "displayName":"Alex", "theme":"olive", "avatarUrl":"https://img.example/avatar.png" }
""");
        assertThat(res.statusCode(), is(200));
        assertThat(JsonPath.read(res.body(), "$.displayName"), is("Alex"));
        assertThat(JsonPath.read(res.body(), "$.theme"), is("olive"));
        assertThat(JsonPath.read(res.body(), "$.avatarUrl"), is("https://img.example/avatar.png"));
    }

    @Test
    void patch_shouldRejectBlankDisplayName() throws Exception {
        String token = tokens.issue("user-1");

        HttpResponse<String> res = patch("/api/profile", token, """
{ "displayName":"   " }
""");
        assertThat(res.statusCode(), is(400));
        assertThat(res.headers().firstValue("content-type").orElse(""), containsString("application/problem+json"));
    }

    @Test
    void profile_shouldBeScopedByUser() throws Exception {
        String tokenUser1 = tokens.issue("user-1");
        String tokenUser2 = tokens.issue("user-2");

        patch("/api/profile", tokenUser1, """
{ "displayName":"User One" }
""");

        HttpResponse<String> res = get("/api/profile", tokenUser2);
        assertThat(res.statusCode(), is(200));
        assertThat(JsonPath.read(res.body(), "$.displayName"), nullValue());
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

    private HttpResponse<String> patch(String path, String token, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(uri(path))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .method("PATCH", HttpRequest.BodyPublishers.ofString(json))
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }
}
