package com.mealflow.appapi.integrations.v1;

import com.mealflow.appapi.security.oauth.OAuthGrantValidator;
import com.mealflow.appapi.support.MongoTestContainerConfig;
import com.mealflow.appapi.support.TestAccessTokenFactory;
import com.mealflow.appapi.support.TestJwtConfig;
import com.mongodb.client.MongoCollection;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.ActiveProfiles;

/**
 * Shared helpers for /integrations/v1 ITs: mints OAuth access tokens shaped exactly like the ones
 * identity-service (Spring Authorization Server) issues, seeds the matching grant document in the
 * identity DB (which falls back to app-api's Mongo in tests) and wraps the HTTP client.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestJwtConfig.class)
abstract class IntegrationApiTestBase extends MongoTestContainerConfig {

    static final List<String> ALL_SCOPES = List.of(
            "recipes.read",
            "recipes.write",
            "mealplan.read",
            "mealplan.write",
            "shoppinglist.read",
            "shoppinglist.write");
    static final List<String> READ_SCOPES = List.of("recipes.read", "mealplan.read", "shoppinglist.read");

    @LocalServerPort
    int port;

    @Autowired
    JwtEncoder encoder;

    @Autowired
    @Qualifier("identityOAuthAuthorizations")
    MongoCollection<Document> grants;

    @Autowired
    OAuthGrantValidator grantValidator;

    @Value("${security.jwt.issuer}")
    String issuer;

    final HttpClient http = HttpClient.newHttpClient();

    @AfterEach
    void resetGrants() {
        grants.deleteMany(new Document());
        grantValidator.invalidateAll();
    }

    /** Seeds an active grant for the user and returns a token bound to it. */
    String token(String userId, List<String> scopes) {
        String gid = seedGrant(userId);
        return mint(userId, scopes, gid, Map.of());
    }

    String seedGrant(String userId) {
        String gid = "grant-" + UUID.randomUUID();
        grants.insertOne(new Document("_id", gid)
                .append("principalName", userId)
                .append("registeredClientId", "rc-personal-os")
                .append("revoked", false));
        return gid;
    }

    String mint(String userId, List<String> scopes, String gid, Map<String, Object> overrides) {
        Instant now = Instant.now();
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .subject(userId)
                .audience(List.of("mealflow-integrations"))
                .issuedAt(now)
                .notBefore(now)
                .expiresAt(now.plusSeconds(300))
                .id(UUID.randomUUID().toString())
                .claim("client_id", "personal-os")
                .claim("scope", scopes)
                .claim("gid", gid);
        overrides.forEach((name, value) -> {
            if (value == null) {
                claims.claims(c -> c.remove(name));
            } else {
                claims.claim(name, value);
            }
        });
        return encoder.encode(JwtEncoderParameters.from(claims.build())).getTokenValue();
    }

    String firstPartyToken(String userId) {
        return new TestAccessTokenFactory(encoder).issue(userId);
    }

    static String key() {
        return UUID.randomUUID().toString();
    }

    HttpResponse<String> get(String path, String token) throws Exception {
        return send(path, token, "GET", null, null, null);
    }

    HttpResponse<String> send(
            String path, String token, String method, String json, String idempotencyKey, String ifMatch)
            throws Exception {
        HttpRequest.Builder req = HttpRequest.newBuilder().uri(URI.create("http://localhost:" + port + path));
        if (token != null) {
            req.header("Authorization", "Bearer " + token);
        }
        if (idempotencyKey != null) {
            req.header("Idempotency-Key", idempotencyKey);
        }
        if (ifMatch != null) {
            req.header("If-Match", ifMatch);
        }
        if (json != null) {
            req.header("Content-Type", "application/json");
            req.method(method, HttpRequest.BodyPublishers.ofString(json));
        } else {
            req.method(method, HttpRequest.BodyPublishers.noBody());
        }
        return http.send(req.build(), HttpResponse.BodyHandlers.ofString());
    }

    HttpResponse<String> post(String path, String token, String json, String idempotencyKey) throws Exception {
        return send(path, token, "POST", json, idempotencyKey, null);
    }

    static String etag(HttpResponse<String> response) {
        return response.headers().firstValue("ETag").orElse(null);
    }
}
