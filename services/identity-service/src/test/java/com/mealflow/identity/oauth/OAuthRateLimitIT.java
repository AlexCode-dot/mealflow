package com.mealflow.identity.oauth;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.mealflow.identity.support.TestRsaKeysConfig;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

/** Token, revoke and OAuth login endpoints are rate limited per IP like the API auth endpoints. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestRsaKeysConfig.class)
@TestPropertySource(
        properties = {
            "app.ratelimit.enabled=true",
            "app.ratelimit.oauth-token-per-minute=2",
            "app.ratelimit.oauth-revoke-per-minute=2",
            "app.ratelimit.login-per-minute=2"
        })
class OAuthRateLimitIT {

    @LocalServerPort
    private int port;

    private final HttpClient http =
            HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();

    @Test
    void tokenEndpoint_returns429_afterLimit() throws Exception {
        assertThat(post("/oauth2/token", "10.0.0.1").statusCode(), not(is(429)));
        assertThat(post("/oauth2/token", "10.0.0.1").statusCode(), not(is(429)));
        HttpResponse<String> blocked = post("/oauth2/token", "10.0.0.1");
        assertThat(blocked.statusCode(), is(429));
        assertThat(blocked.headers().firstValue("Retry-After").isPresent(), is(true));
        // Other IPs unaffected.
        assertThat(post("/oauth2/token", "10.0.0.2").statusCode(), not(is(429)));
    }

    @Test
    void revokeEndpoint_returns429_afterLimit() throws Exception {
        post("/oauth2/revoke", "10.0.1.1");
        post("/oauth2/revoke", "10.0.1.1");
        assertThat(post("/oauth2/revoke", "10.0.1.1").statusCode(), is(429));
    }

    @Test
    void oauthLogin_sharesTheLoginLimit() throws Exception {
        post("/oauth/login", "10.0.2.1");
        post("/oauth/login", "10.0.2.1");
        assertThat(post("/oauth/login", "10.0.2.1").statusCode(), is(429));
    }

    private HttpResponse<String> post(String path, String ip) throws Exception {
        return http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                        .header("X-Forwarded-For", ip)
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials"))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }
}
