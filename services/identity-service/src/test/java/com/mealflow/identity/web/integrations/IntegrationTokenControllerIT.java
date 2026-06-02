package com.mealflow.identity.web.integrations;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.identity.integrations.repository.IntegrationTokenRepository;
import com.mealflow.identity.support.MongoTestContainerConfig;
import com.mealflow.identity.support.TestRsaKeysConfig;
import com.mealflow.identity.token.repository.RefreshTokenRepository;
import com.mealflow.identity.user.repository.UserRepository;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestRsaKeysConfig.class)
class IntegrationTokenControllerIT extends MongoTestContainerConfig {

    @LocalServerPort
    private int port;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final IntegrationTokenRepository integrationTokenRepository;
    private final HttpClient http = HttpClient.newHttpClient();

    @Autowired
    IntegrationTokenControllerIT(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            IntegrationTokenRepository integrationTokenRepository) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.integrationTokenRepository = integrationTokenRepository;
    }

    @AfterEach
    void cleanup() {
        integrationTokenRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void create_list_revoke_shouldRoundTrip() throws Exception {
        String accessToken = registerAndGetAccessToken("integ.test+a@mealflow.dev");

        HttpResponse<String> created = postJson(
                "/auth/integrations", accessToken, "{\"name\":\"second-brain-ai\",\"scopes\":[\"recipes:read\"]}");
        assertThat(created.statusCode(), is(201));

        String id = JsonPath.read(created.body(), "$.id");
        String rawToken = JsonPath.read(created.body(), "$.token");
        String preview = JsonPath.read(created.body(), "$.tokenPreview");
        assertThat(id, not(blankOrNullString()));
        assertThat(rawToken, startsWith("mfi_"));
        assertThat(rawToken.length(), greaterThan(20));
        assertThat(preview, is(rawToken.substring(0, 12)));
        assertThat(JsonPath.read(created.body(), "$.expiresAt"), nullValue());

        HttpResponse<String> list = getWithBearer("/auth/integrations", accessToken);
        assertThat(list.statusCode(), is(200));
        assertThat(JsonPath.read(list.body(), "$[0].id").toString(), is(id));
        assertThat(JsonPath.read(list.body(), "$[0].name").toString(), is("second-brain-ai"));
        // raw token must not appear in subsequent reads
        assertThat(list.body(), not(containsString(rawToken)));

        HttpResponse<String> revoked = deleteWithBearer("/auth/integrations/" + id, accessToken);
        assertThat(revoked.statusCode(), is(204));

        HttpResponse<String> afterRevoke = getWithBearer("/auth/integrations", accessToken);
        assertThat(JsonPath.read(afterRevoke.body(), "$[0].revokedAt"), notNullValue());
    }

    @Test
    void create_withoutScopes_shouldDefaultToReadAndWrite() throws Exception {
        String accessToken = registerAndGetAccessToken("integ.test+default@mealflow.dev");
        HttpResponse<String> created = postJson("/auth/integrations", accessToken, "{\"name\":\"defaults\"}");
        assertThat(created.statusCode(), is(201));
        java.util.List<Object> scopes = JsonPath.read(created.body(), "$.scopes");
        assertThat(scopes, containsInAnyOrder("recipes:read", "recipes:write"));
    }

    @Test
    void create_withUnknownScope_shouldReturn400() throws Exception {
        String accessToken = registerAndGetAccessToken("integ.test+badscope@mealflow.dev");
        HttpResponse<String> resp =
                postJson("/auth/integrations", accessToken, "{\"name\":\"bad\",\"scopes\":[\"recipes:nuke\"]}");
        assertThat(resp.statusCode(), is(400));
    }

    @Test
    void create_withExpiry_shouldSetExpiresAt() throws Exception {
        String accessToken = registerAndGetAccessToken("integ.test+exp@mealflow.dev");
        java.time.Instant before = java.time.Instant.now();
        HttpResponse<String> created =
                postJson("/auth/integrations", accessToken, "{\"name\":\"with-expiry\",\"expiresInDays\":30}");
        assertThat(created.statusCode(), is(201));
        String createdExpiresAt = JsonPath.read(created.body(), "$.expiresAt");
        assertThat(createdExpiresAt, not(blankOrNullString()));

        java.time.Instant parsed = java.time.Instant.parse(createdExpiresAt);
        // Should be ~30 days from now (allow a generous window for test slowness).
        long minutesAhead = java.time.Duration.between(before, parsed).toMinutes();
        assertThat(
                minutesAhead, both(greaterThanOrEqualTo(30L * 24 * 60 - 5)).and(lessThanOrEqualTo(30L * 24 * 60 + 5)));

        // List response also has an expiresAt — Mongo persistence loses sub-millisecond precision so we
        // compare epoch-second only.
        HttpResponse<String> list = getWithBearer("/auth/integrations", accessToken);
        String listExpiresAt = JsonPath.read(list.body(), "$[0].expiresAt").toString();
        assertThat(java.time.Instant.parse(listExpiresAt).getEpochSecond(), is(parsed.getEpochSecond()));
    }

    @Test
    void create_withInvalidExpiry_shouldReturn400() throws Exception {
        String accessToken = registerAndGetAccessToken("integ.test+badexp@mealflow.dev");
        HttpResponse<String> resp =
                postJson("/auth/integrations", accessToken, "{\"name\":\"bad\",\"expiresInDays\":0}");
        assertThat(resp.statusCode(), is(400));
    }

    @Test
    void revoke_unknownId_shouldReturn404() throws Exception {
        String accessToken = registerAndGetAccessToken("integ.test+b@mealflow.dev");
        HttpResponse<String> resp = deleteWithBearer("/auth/integrations/nope-id", accessToken);
        assertThat(resp.statusCode(), is(404));
    }

    @Test
    void create_withoutAuth_shouldReturn401() throws Exception {
        HttpResponse<String> resp = postJson("/auth/integrations", null, "{\"name\":\"x\"}");
        assertThat(resp.statusCode(), is(401));
    }

    @Test
    void create_withMfiBearer_shouldReturn401_becauseNotAValidJwt() throws Exception {
        // Sending an opaque mfi_* token to identity-service must not work — JWT decoding fails.
        HttpResponse<String> resp = postJson("/auth/integrations", "mfi_dev_fakebutshaped", "{\"name\":\"x\"}");
        assertThat(resp.statusCode(), is(401));
    }

    @Test
    void create_blankName_shouldReturn400() throws Exception {
        String accessToken = registerAndGetAccessToken("integ.test+c@mealflow.dev");
        HttpResponse<String> resp = postJson("/auth/integrations", accessToken, "{\"name\":\"\"}");
        assertThat(resp.statusCode(), is(400));
    }

    private String registerAndGetAccessToken(String email) throws Exception {
        HttpResponse<String> reg =
                postJson("/auth/register", null, "{\"email\":\"" + email + "\",\"password\":\"VeryStrongPass123!\"}");
        assertThat(reg.statusCode(), is(201));
        // Bypass email verification by marking the user as verified directly in the DB.
        com.mealflow.identity.user.domain.User user =
                userRepository.findByEmail(email).orElseThrow();
        user.markEmailVerified(java.time.Instant.now());
        userRepository.save(user);
        HttpResponse<String> login =
                postJson("/auth/login", null, "{\"email\":\"" + email + "\",\"password\":\"VeryStrongPass123!\"}");
        assertThat(login.statusCode(), is(200));
        return JsonPath.read(login.body(), "$.accessToken");
    }

    private HttpResponse<String> postJson(String path, String accessToken, String json) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + path))
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(json));
        if (accessToken != null) {
            b.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
        }
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> getWithBearer(String path, String token) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + path))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .GET()
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> deleteWithBearer(String path, String token) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + path))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .DELETE()
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }
}
