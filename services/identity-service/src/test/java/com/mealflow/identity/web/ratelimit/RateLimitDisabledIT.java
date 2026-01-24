package com.mealflow.identity.web.ratelimit;

import static org.hamcrest.MatcherAssert.assertThat;
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
@TestPropertySource(properties = {
        "app.ratelimit.enabled=false",
        "app.ratelimit.jwks-per-minute=1"
})
class RateLimitDisabledIT {

    @LocalServerPort
    private int port;

    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void jwks_shouldNotRateLimit_whenDisabled() throws Exception {
        for (int i = 0; i < 3; i++) {
            HttpResponse<String> res = getJwks();
            assertThat(res.statusCode(), is(200));
        }
    }

    private HttpResponse<String> getJwks() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/.well-known/jwks.json"))
                .header("X-Forwarded-For", "1.2.3.4")
                .GET()
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
