package com.mealflow.identity.web.auth;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import com.jayway.jsonpath.JsonPath;
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
class AuthControllerIT extends MongoTestContainerConfig {

    @LocalServerPort
    private int port;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    private final HttpClient http = HttpClient.newHttpClient();

    @Autowired
    AuthControllerIT(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @AfterEach
    void cleanupDb() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void register_login_refresh_logout_shouldWorkEndToEnd() throws Exception {
        String email = "test.user@mealflow.dev";
        String password = "VeryStrongPass123!";

        // 1) REGISTER
        HttpResponse<String> reg = post("/auth/register", jsonRegister(email, password));

        assertThat(reg.statusCode(), is(201));
        assertThat(reg.headers().firstValue("content-type").orElse(""), containsString("application/json"));

        Tokens registered = extractTokens(reg.body());
        assertThat(registered.accessToken(), not(blankOrNullString()));
        assertThat(registered.refreshToken(), not(blankOrNullString()));

        // 2) LOGIN
        HttpResponse<String> login = post("/auth/login", jsonLogin(email, password));

        assertThat(login.statusCode(), is(200));
        Tokens loggedIn = extractTokens(login.body());
        assertNotEquals(registered.refreshToken(), loggedIn.refreshToken());

        // 3) REFRESH (rotation)
        HttpResponse<String> refresh = post("/auth/refresh", jsonRefresh(loggedIn.refreshToken()));

        assertThat(refresh.statusCode(), is(200));
        Tokens refreshed = extractTokens(refresh.body());
        assertNotEquals(loggedIn.refreshToken(), refreshed.refreshToken());

        // 4) REPLAY should be 401
        HttpResponse<String> replay = post("/auth/refresh", jsonRefresh(loggedIn.refreshToken()));

        assertThat(replay.statusCode(), is(401));
        assertThat(replay.headers().firstValue("content-type").orElse(""), containsString("application/problem+json"));

        // 5) LOGOUT
        HttpResponse<String> logout = post("/auth/logout", jsonLogout(refreshed.refreshToken()));

        assertThat(logout.statusCode(), is(204));

        // 6) refresh after logout should fail
        HttpResponse<String> afterLogout = post("/auth/refresh", jsonRefresh(refreshed.refreshToken()));

        assertThat(afterLogout.statusCode(), is(401));
    }

    @Test
    void register_shouldReturn409_whenEmailAlreadyExists() throws Exception {
        String email = "duplicate@mealflow.dev";
        String password = "VeryStrongPass123!";

        assertThat(post("/auth/register", jsonRegister(email, password)).statusCode(), is(201));

        HttpResponse<String> dup = post("/auth/register", jsonRegister(email, password));
        assertThat(dup.statusCode(), is(409));
        assertThat(dup.headers().firstValue("content-type").orElse(""), containsString("application/problem+json"));
        assertThat(JsonPath.read(dup.body(), "$.path"), is("/auth/register"));
    }

    @Test
    void login_shouldReturn401_whenPasswordIsWrong() throws Exception {
        String email = "wrong.pass@mealflow.dev";
        String password = "VeryStrongPass123!";

        assertThat(post("/auth/register", jsonRegister(email, password)).statusCode(), is(201));

        HttpResponse<String> bad = post("/auth/login", jsonLogin(email, "WrongPassword123!"));

        assertThat(bad.statusCode(), is(401));
        assertThat(bad.headers().firstValue("content-type").orElse(""), containsString("application/problem+json"));
        assertThat(JsonPath.read(bad.body(), "$.path"), is("/auth/login"));
    }

    // -------------------------
    // HTTP helpers
    // -------------------------

    private HttpResponse<String> post(String path, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + path))
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }

    private static String jsonRegister(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    private static String jsonLogin(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    private static String jsonRefresh(String refreshToken) {
        return "{\"refreshToken\":\"" + refreshToken + "\"}";
    }

    private static String jsonLogout(String refreshToken) {
        return "{\"refreshToken\":\"" + refreshToken + "\"}";
    }

    private static Tokens extractTokens(String body) {
        String accessToken = JsonPath.read(body, "$.accessToken");
        String refreshToken = JsonPath.read(body, "$.refreshToken");
        return new Tokens(accessToken, refreshToken);
    }

    record Tokens(String accessToken, String refreshToken) {}
}
