package com.mealflow.appapi.web.ratelimit;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.greaterThan;

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
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestJwtConfig.class)
@TestPropertySource(properties = {
        "app.ratelimit.enabled=true",
        "app.ratelimit.api-per-minute=2"
})
class RateLimitIT extends MongoTestContainerConfig {

    @LocalServerPort
    private int port;

    private final HttpClient http = HttpClient.newHttpClient();
    private final TestAccessTokenFactory tokens;

    @Autowired
    RateLimitIT(JwtEncoder encoder) {
        this.tokens = new TestAccessTokenFactory(encoder);
    }

    @Test
    void api_shouldReturn429_afterLimitExceeded() throws Exception {
        String token = tokens.issue("user-rate-limit-it");

        assertThat(getProfile(token).statusCode(), is(200));
        assertThat(getProfile(token).statusCode(), is(200));
        HttpResponse<String> blocked = getProfile(token);
        assertThat(blocked.statusCode(), is(429));
        int retry = Integer.parseInt(blocked.headers().firstValue("Retry-After").orElse("0"));
        assertThat(retry, greaterThan(0));
    }

    @Test
    void api_shouldNotShareLimitsBetweenUsers() throws Exception {
        String tokenA = tokens.issue("user-rate-limit-a");
        String tokenB = tokens.issue("user-rate-limit-b");

        assertThat(getProfile(tokenA).statusCode(), is(200));
        assertThat(getProfile(tokenA).statusCode(), is(200));
        assertThat(getProfile(tokenA).statusCode(), is(429));

        assertThat(getProfile(tokenB).statusCode(), is(200));
        assertThat(getProfile(tokenB).statusCode(), is(200));
    }

    @Test
    void api_shouldNotShareLimitsBetweenIps_whenNoJwt() throws Exception {
        // Even unauthenticated requests are rate limited to protect the service.
        assertThat(getProfileNoAuth("1.2.3.4").statusCode(), is(401));
        assertThat(getProfileNoAuth("1.2.3.4").statusCode(), is(401));
        assertThat(getProfileNoAuth("1.2.3.4").statusCode(), is(429));

        assertThat(getProfileNoAuth("5.6.7.8").statusCode(), is(401));
        assertThat(getProfileNoAuth("5.6.7.8").statusCode(), is(401));
    }

    private HttpResponse<String> getProfile(String token) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/api/profile"))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> getProfileNoAuth(String ip) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/api/profile"))
                .header("X-Forwarded-For", ip)
                .GET()
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
