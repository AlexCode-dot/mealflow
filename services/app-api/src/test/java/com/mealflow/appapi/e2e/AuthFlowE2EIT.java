package com.mealflow.appapi.e2e;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.jayway.jsonpath.JsonPath;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("e2e")
class AuthFlowE2EIT {

    // Defaults match your local setup; can be overridden in CI via env vars.
    private static final String IDENTITY_BASE =
            System.getenv().getOrDefault("IDENTITY_BASE_URL", "http://localhost:8081");
    private static final String APP_API_BASE =
            System.getenv().getOrDefault("APP_API_BASE_URL", "http://localhost:8082");

    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void register_then_callProtectedEndpoint_shouldWorkEndToEnd() throws Exception {

        // Pre-flight checks (fail fast if services are down)
        assertServiceUp(IDENTITY_BASE + "/.well-known/jwks.json", "Identity Service");
        // /api/me returns 401 when unauthenticated → still means App API is up
        assertServiceUp(APP_API_BASE + "/api/me", "App API");

        String email = "e2e+" + UUID.randomUUID() + "@mealflow.dev";
        String password = "VeryStrongPass123!";

        // 1) Register at Identity
        HttpResponse<String> reg = postJson(IDENTITY_BASE + "/auth/register", jsonRegister(email, password));

        assertThat(reg.statusCode(), is(201));
        assertThat(reg.headers().firstValue("content-type").orElse(""), containsString("application/json"));

        String accessToken = JsonPath.read(reg.body(), "$.accessToken");
        assertThat(accessToken, not(blankOrNullString()));

        // 2) Call protected endpoint on App API using access token
        HttpResponse<String> me = getWithBearer(APP_API_BASE + "/api/me", accessToken);

        assertThat(me.statusCode(), is(200));
        assertThat(me.headers().firstValue("content-type").orElse(""), containsString("application/json"));

        String userIdFromApi = JsonPath.read(me.body(), "$.userId");
        assertThat(userIdFromApi, not(blankOrNullString()));

        // 3) Validate that App API userId matches JWT sub
        String sub = jwtSubject(accessToken);
        assertThat(userIdFromApi, is(sub));
    }

    // HTTP helpers

    private HttpResponse<String> postJson(String url, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> getWithBearer(String url, String accessToken) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();

        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }

    private static String jsonRegister(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    // JWT helpers

    private static String jwtSubject(String jwt) {
        String[] parts = jwt.split("\\.");
        if (parts.length != 3) throw new IllegalArgumentException("Invalid JWT format");

        byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
        String payloadJson = new String(payloadBytes, StandardCharsets.UTF_8);

        return JsonPath.read(payloadJson, "$.sub");
    }

    private void assertServiceUp(String url, String name) throws Exception {
        try {
            HttpRequest req =
                    HttpRequest.newBuilder().uri(URI.create(url)).GET().build();
            HttpResponse<Void> res = http.send(req, HttpResponse.BodyHandlers.discarding());
            assertThat(name + " not reachable at " + url, res.statusCode(), greaterThan(0));
        } catch (Exception e) {
            throw new AssertionError(name + " is not running at " + url + ": " + e.getMessage(), e);
        }
    }
}
