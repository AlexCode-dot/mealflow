package com.mealflow.appapi.web.ratelimit;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

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
        "app.ratelimit.enabled=false",
        "app.ratelimit.api-per-minute=1"
})
class RateLimitDisabledIT extends MongoTestContainerConfig {

    @LocalServerPort
    private int port;

    private final HttpClient http = HttpClient.newHttpClient();
    private final TestAccessTokenFactory tokens;

    @Autowired
    RateLimitDisabledIT(JwtEncoder encoder) {
        this.tokens = new TestAccessTokenFactory(encoder);
    }

    @Test
    void api_shouldNotRateLimit_whenDisabled() throws Exception {
        String token = tokens.issue("user-rate-limit-disabled");

        for (int i = 0; i < 3; i++) {
            HttpResponse<String> res = getProfile(token);
            assertThat(res.statusCode(), is(200));
        }
    }

    private HttpResponse<String> getProfile(String token) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/api/profile"))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
