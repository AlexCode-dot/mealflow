package com.mealflow.appapi.security.integrations;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.appapi.support.MongoTestContainerConfig;
import com.mealflow.appapi.support.TestJwtConfig;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestJwtConfig.class)
class IntegrationTokenAuthIT extends MongoTestContainerConfig {

    @LocalServerPort
    private int port;

    private final HttpClient http = HttpClient.newHttpClient();
    private final MongoCollection<Document> tokens;
    private final IntegrationTokenAuthService authService;
    private final TokenHasher hasher;

    @Autowired
    IntegrationTokenAuthIT(
            @Qualifier("identityIntegrationTokens") MongoCollection<Document> tokens,
            IntegrationTokenAuthService authService,
            TokenHasher hasher) {
        this.tokens = tokens;
        this.authService = authService;
        this.hasher = hasher;
    }

    @AfterEach
    void cleanup() {
        tokens.drop();
    }

    private static final List<String> FULL_SCOPES = List.of("recipes:read", "recipes:write");

    @Test
    void recipesEndpoint_shouldAcceptIntegrationToken() throws Exception {
        String raw = seedToken("user-mfi-1", FULL_SCOPES, null);

        HttpResponse<String> resp = post("/api/recipes", raw, "{\"title\":\"From integration\"}");
        assertThat(resp.statusCode(), is(201));
        assertThat(JsonPath.read(resp.body(), "$.title").toString(), is("From integration"));

        HttpResponse<String> list = get("/api/recipes", raw);
        assertThat(list.statusCode(), is(200));
        assertThat(JsonPath.read(list.body(), "$[0].title").toString(), is("From integration"));
    }

    @Test
    void revokedToken_shouldReturn401() throws Exception {
        String raw = seedToken("user-mfi-2", FULL_SCOPES, null);
        String hash = hasher.sha256(raw);

        assertThat(get("/api/recipes", raw).statusCode(), is(200));

        tokens.updateOne(Filters.eq("tokenHash", hash), Updates.set("revokedAt", Instant.now()));
        authService.invalidate(hash);

        HttpResponse<String> resp = get("/api/recipes", raw);
        assertThat(resp.statusCode(), is(401));
    }

    @Test
    void unknownIntegrationToken_shouldReturn401() throws Exception {
        HttpResponse<String> resp = get("/api/recipes", "mfi_dev_unknownTokenValue");
        assertThat(resp.statusCode(), is(401));
    }

    @Test
    void integrationToken_userScoping_shouldIsolateData() throws Exception {
        String tokenA = seedToken("user-A", FULL_SCOPES, null);
        String tokenB = seedToken("user-B", FULL_SCOPES, null);

        HttpResponse<String> created = post("/api/recipes", tokenA, "{\"title\":\"A's recipe\"}");
        String id = JsonPath.read(created.body(), "$.id");

        HttpResponse<String> bSees = get("/api/recipes/" + id, tokenB);
        assertThat(bSees.statusCode(), is(404));
    }

    @Test
    void readOnlyToken_shouldGetButNotPost() throws Exception {
        String raw = seedToken("user-readonly", List.of("recipes:read"), null);

        // Seed a recipe directly with a write-capable token so the read has something to find.
        String writeRaw = seedToken("user-readonly", FULL_SCOPES, null);
        post("/api/recipes", writeRaw, "{\"title\":\"Visible to read-only\"}");

        HttpResponse<String> reads = get("/api/recipes", raw);
        assertThat(reads.statusCode(), is(200));

        HttpResponse<String> writes = post("/api/recipes", raw, "{\"title\":\"blocked\"}");
        assertThat(writes.statusCode(), is(403));
        assertThat(writes.body(), containsString("recipes:write"));
    }

    @Test
    void writeOnlyToken_shouldPostButNotGet() throws Exception {
        String raw = seedToken("user-writeonly", List.of("recipes:write"), null);

        HttpResponse<String> writes = post("/api/recipes", raw, "{\"title\":\"From writer\"}");
        assertThat(writes.statusCode(), is(201));

        HttpResponse<String> reads = get("/api/recipes", raw);
        assertThat(reads.statusCode(), is(403));
        assertThat(reads.body(), containsString("recipes:read"));
    }

    @Test
    void integrationToken_outsideRecipeArea_shouldReturn403() throws Exception {
        String raw = seedToken("user-out-of-area", FULL_SCOPES, null);

        HttpResponse<String> resp = get("/api/me", raw);
        assertThat(resp.statusCode(), is(403));
    }

    @Test
    void expiredToken_shouldReturn401() throws Exception {
        String raw = seedToken("user-expired", FULL_SCOPES, Instant.now().minusSeconds(60));

        HttpResponse<String> resp = get("/api/recipes", raw);
        assertThat(resp.statusCode(), is(401));
    }

    @Test
    void notYetExpiredToken_shouldStillWork() throws Exception {
        String raw = seedToken("user-future", FULL_SCOPES, Instant.now().plusSeconds(3600));

        HttpResponse<String> resp = get("/api/recipes", raw);
        assertThat(resp.statusCode(), is(200));
    }

    private String seedToken(String userId, List<String> scopes, Instant expiresAt) {
        String raw = "mfi_test_" + java.util.UUID.randomUUID().toString().replace("-", "");
        String hash = hasher.sha256(raw);

        Document doc = new Document()
                .append("_id", "tok-" + userId + "-" + System.nanoTime())
                .append("userId", userId)
                .append("name", "test-token")
                .append("tokenHash", hash)
                .append("tokenPreview", raw.substring(0, 12))
                .append("scopes", scopes == null ? List.of() : scopes)
                .append("createdAt", Instant.now())
                .append("lastUsedAt", null)
                .append("revokedAt", null)
                .append("expiresAt", expiresAt);
        tokens.insertOne(doc);
        return raw;
    }

    private HttpResponse<String> get(String path, String token) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + path))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .GET()
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String path, String token, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + path))
                .header(HttpHeaders.CONTENT_TYPE, "application/json")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }
}
