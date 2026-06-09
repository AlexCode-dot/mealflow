package com.mealflow.appapi.e2e;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.jayway.jsonpath.JsonPath;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("e2e")
class AuthFlowE2EIT {

    // Defaults match your local setup; can be overridden in CI via env vars.
    private static final String IDENTITY_BASE =
            System.getenv().getOrDefault("IDENTITY_BASE_URL", "http://localhost:8081");
    private static final String APP_API_BASE =
            System.getenv().getOrDefault("APP_API_BASE_URL", "http://localhost:8082");

    // The identity-service runs with the `dev` profile and no Resend API key, so the OTP
    // verification code is not emailed — it is logged at WARN level instead (see ResendClient).
    // The E2E test recovers the code from that log file to complete the verify-email step.
    // Path is relative to the app-api module (the test's working directory) by default.
    private static final String IDENTITY_LOG_PATH =
            System.getenv().getOrDefault("IDENTITY_LOG_PATH", "../identity-service/identity.log");

    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void register_verifyEmail_thenCallProtectedEndpoint_shouldWorkEndToEnd() throws Exception {

        // Pre-flight checks (fail fast if services are down)
        assertServiceUp(IDENTITY_BASE + "/.well-known/jwks.json", "Identity Service");
        // /api/me returns 401 when unauthenticated → still means App API is up
        assertServiceUp(APP_API_BASE + "/api/me", "App API");

        String email = "e2e+" + UUID.randomUUID() + "@mealflow.dev";
        String password = "VeryStrongPass123!";

        // 1) Register at Identity. Registration no longer returns tokens — the account starts
        //    unverified and a verification code is issued.
        HttpResponse<String> reg = postJson(IDENTITY_BASE + "/auth/register", jsonRegister(email, password));

        assertThat(reg.statusCode(), is(201));
        assertThat(reg.headers().firstValue("content-type").orElse(""), containsString("application/json"));
        assertThat(JsonPath.read(reg.body(), "$.verificationRequired"), is(true));

        // 2) Recover the OTP code the dev profile logged, then verify the email to obtain tokens.
        String code = readVerificationCodeFromLog(email);
        HttpResponse<String> verify = postJson(IDENTITY_BASE + "/auth/verify-email", jsonVerify(email, code));

        assertThat(verify.statusCode(), is(200));
        assertThat(verify.headers().firstValue("content-type").orElse(""), containsString("application/json"));

        String accessToken = JsonPath.read(verify.body(), "$.accessToken");
        assertThat(accessToken, not(blankOrNullString()));

        // 3) Call protected endpoint on App API using the access token
        HttpResponse<String> me = getWithBearer(APP_API_BASE + "/api/me", accessToken);

        assertThat(me.statusCode(), is(200));
        assertThat(me.headers().firstValue("content-type").orElse(""), containsString("application/json"));

        String userIdFromApi = JsonPath.read(me.body(), "$.userId");
        assertThat(userIdFromApi, not(blankOrNullString()));

        // 4) Validate that App API userId matches JWT sub
        String sub = jwtSubject(accessToken);
        assertThat(userIdFromApi, is(sub));
    }

    // Verification-code recovery

    /**
     * Poll the identity-service log for the 6-digit verification code issued for {@code email}.
     * In the dev profile (no Resend key) the code is logged instead of emailed; this is the only
     * way a black-box E2E test can complete the verify-email step.
     */
    private String readVerificationCodeFromLog(String email) throws Exception {
        Path log = Path.of(IDENTITY_LOG_PATH);
        // The code is logged synchronously while handling /auth/register, so it should already be
        // present, but poll briefly to absorb any log-flush latency.
        Pattern pattern = Pattern.compile(
                "Email to <" + Pattern.quote(email) + ">.*?verification code is (\\d{6})", Pattern.DOTALL);
        for (int attempt = 0; attempt < 40; attempt++) {
            if (Files.exists(log)) {
                String contents = Files.readString(log, StandardCharsets.UTF_8);
                Matcher matcher = pattern.matcher(contents);
                String last = null;
                while (matcher.find()) {
                    last = matcher.group(1); // take the most recent code for this email
                }
                if (last != null) {
                    return last;
                }
            }
            Thread.sleep(250);
        }
        throw new AssertionError("Could not find a verification code for <" + email + "> in identity log at "
                + log.toAbsolutePath()
                + ". Ensure identity-service runs with the dev profile and no Resend API key so the code is logged.");
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

    private static String jsonVerify(String email, String code) {
        return "{\"email\":\"" + email + "\",\"code\":\"" + code + "\"}";
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
