package com.mealflow.identity.web.ratelimit;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;

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

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestRsaKeysConfig.class)
@TestPropertySource(properties = {"app.ratelimit.enabled=true", "app.ratelimit.jwks-per-minute=2"})
class RateLimitIT {

    @LocalServerPort
    private int port;

    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void jwks_shouldReturn429_afterLimitExceeded() throws Exception {
        String ip = "1.2.3.4";
        assertThat(getJwks(ip).statusCode(), is(200));
        assertThat(getJwks(ip).statusCode(), is(200));
        HttpResponse<String> blocked = getJwks(ip);
        assertThat(blocked.statusCode(), is(429));
        int retry = Integer.parseInt(blocked.headers().firstValue("Retry-After").orElse("0"));
        assertThat(retry, greaterThan(0));
    }

    @Test
    void jwks_shouldNotShareLimitsBetweenIps() throws Exception {
        assertThat(getJwks("5.6.7.8").statusCode(), is(200));
        assertThat(getJwks("5.6.7.8").statusCode(), is(200));
        assertThat(getJwks("5.6.7.8").statusCode(), is(429));

        assertThat(getJwks("9.9.9.9").statusCode(), is(200));
        assertThat(getJwks("9.9.9.9").statusCode(), is(200));
    }

    private HttpResponse<String> getJwks(String ip) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/.well-known/jwks.json"))
                .header("X-Forwarded-For", ip)
                .GET()
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
