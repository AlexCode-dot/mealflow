package com.mealflow.appapi.recipes.extraction.web;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.appapi.recipes.extraction.client.AnthropicClient;
import com.mealflow.appapi.recipes.extraction.client.AnthropicMessageResponse;
import com.mealflow.appapi.support.MongoTestContainerConfig;
import com.mealflow.appapi.support.TestAccessTokenFactory;
import com.mealflow.appapi.support.TestJwtConfig;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestJwtConfig.class)
@TestPropertySource(
        properties = {"anthropic.api-key=test-key", "app.ratelimit.enabled=false", "app.extraction.max-per-day=0"})
class ExtractionControllerIT extends MongoTestContainerConfig {

    @LocalServerPort
    private int port;

    @MockitoBean
    private AnthropicClient anthropicClient;

    private final HttpClient http = HttpClient.newHttpClient();
    private final TestAccessTokenFactory tokens;

    @Autowired
    ExtractionControllerIT(JwtEncoder encoder) {
        this.tokens = new TestAccessTokenFactory(encoder);
    }

    @Test
    void uploadImage_runsExtraction_andReturnsReadyDraft() throws Exception {
        when(anthropicClient.createMessage(any())).thenReturn(cannedResponse());

        String token = tokens.issue("user-extract-1");
        HttpResponse<String> upload = postImage(token);
        assertThat(upload.statusCode(), is(202));
        String jobId = JsonPath.read(upload.body(), "$.jobId");
        assertThat(jobId, notNullValue());

        String body = pollUntilTerminal(token, jobId);
        assertThat(JsonPath.read(body, "$.status").toString(), is("READY"));
        assertThat(JsonPath.read(body, "$.draft.title").toString(), is("Pasta"));
        assertThat(JsonPath.read(body, "$.draft.ingredients[0].name").toString(), is("Spaghetti"));
    }

    @Test
    void getJob_returns404_forUnknownId() throws Exception {
        String token = tokens.issue("user-extract-2");
        HttpResponse<String> get = getJob(token, "missing-job-id");
        assertThat(get.statusCode(), is(404));
    }

    @Test
    void getJob_returns404_forJobOwnedByAnotherUser() throws Exception {
        when(anthropicClient.createMessage(any())).thenReturn(cannedResponse());

        String tokenA = tokens.issue("user-extract-a");
        HttpResponse<String> upload = postImage(tokenA);
        String jobId = JsonPath.read(upload.body(), "$.jobId");

        String tokenB = tokens.issue("user-extract-b");
        HttpResponse<String> get = getJob(tokenB, jobId);
        assertThat(get.statusCode(), is(404));
    }

    @Test
    void unauthenticatedRequest_isRejected() throws Exception {
        HttpResponse<String> get = http.send(
                HttpRequest.newBuilder()
                        .uri(URI.create("http://localhost:" + port + "/api/recipes/extract/abc"))
                        .GET()
                        .build(),
                BodyHandlers.ofString());
        assertThat(get.statusCode(), is(401));
    }

    @Test
    void uploadVideo_isAcceptedThroughMultipart() throws Exception {
        // Garbage video bytes will fail ffmpeg; we expect the worker to mark the job FAILED.
        String token = tokens.issue("user-extract-video");
        byte[] body = MultipartHelper.singleFilePart("file", "clip.mp4", "video/mp4", new byte[] {1, 2, 3, 4, 5});
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/api/recipes/extract"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "multipart/form-data; boundary=" + MultipartHelper.BOUNDARY)
                .POST(BodyPublishers.ofByteArray(body))
                .build();
        HttpResponse<String> response = http.send(request, BodyHandlers.ofString());
        assertThat(response.statusCode(), is(202));
        String jobId = JsonPath.read(response.body(), "$.jobId");

        String terminalBody = pollUntilTerminal(token, jobId);
        assertThat(JsonPath.read(terminalBody, "$.status").toString(), is("FAILED"));
    }

    @Test
    void unsupportedContentType_returns400() throws Exception {
        String token = tokens.issue("user-extract-bad");
        byte[] body = MultipartHelper.singleFilePart("file", "doc.txt", "text/plain", "hello".getBytes());
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/api/recipes/extract"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "multipart/form-data; boundary=" + MultipartHelper.BOUNDARY)
                .POST(BodyPublishers.ofByteArray(body))
                .build();
        HttpResponse<String> response = http.send(request, BodyHandlers.ofString());
        assertThat(response.statusCode(), is(400));
    }

    @Test
    void accept_createsRecipeFromExtractedDraft() throws Exception {
        when(anthropicClient.createMessage(any())).thenReturn(cannedResponse());

        String token = tokens.issue("user-extract-accept");
        HttpResponse<String> upload = postImage(token);
        String jobId = JsonPath.read(upload.body(), "$.jobId");

        String ready = pollUntilTerminal(token, jobId);
        assertThat(JsonPath.read(ready, "$.status").toString(), is("READY"));

        String acceptBody = """
                {
                  "title": "Pasta Carbonara",
                  "ingredients": [{"name":"Spaghetti","quantity":400,"unit":"g"}],
                  "steps": ["Boil water","Cook pasta"]
                }
                """;
        HttpRequest accept = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/api/recipes/extract/" + jobId + "/accept"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .POST(BodyPublishers.ofString(acceptBody))
                .build();
        HttpResponse<String> response = http.send(accept, BodyHandlers.ofString());
        assertThat(response.statusCode(), is(201));
        assertThat(JsonPath.read(response.body(), "$.title").toString(), is("Pasta Carbonara"));
        assertThat(JsonPath.read(response.body(), "$.fromExternal"), is(true));

        HttpResponse<String> reaccept = http.send(accept, BodyHandlers.ofString());
        assertThat(reaccept.statusCode(), is(409));
    }

    private HttpResponse<String> postImage(String token) throws Exception {
        byte[] body = MultipartHelper.singleFilePart("file", "photo.jpg", "image/jpeg", MultipartHelper.minimalJpeg());
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/api/recipes/extract?locale=sv-SE"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "multipart/form-data; boundary=" + MultipartHelper.BOUNDARY)
                .POST(BodyPublishers.ofByteArray(body))
                .build();
        return http.send(request, BodyHandlers.ofString());
    }

    private HttpResponse<String> getJob(String token, String jobId) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/api/recipes/extract/" + jobId))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();
        return http.send(request, BodyHandlers.ofString());
    }

    private String pollUntilTerminal(String token, String jobId) throws Exception {
        Set<String> terminalStates = Set.of("READY", "FAILED", "ACCEPTED");
        long deadline = System.nanoTime() + Duration.ofSeconds(15).toNanos();
        String body = "";
        while (System.nanoTime() < deadline) {
            HttpResponse<String> response = getJob(token, jobId);
            assertThat(response.statusCode(), is(200));
            body = response.body();
            String status = JsonPath.read(body, "$.status").toString();
            if (terminalStates.contains(status)) {
                return body;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("Job did not reach a terminal state in time. Last body: " + body);
    }

    private AnthropicMessageResponse cannedResponse() {
        String json = """
                {
                  "title": "Pasta",
                  "description": "Quick pasta",
                  "ingredients": [{"name":"Spaghetti","quantity":400,"unit":"g"}],
                  "steps": ["Boil water","Cook"],
                  "cookingTimeMinutes": 20,
                  "portions": 4,
                  "category": "dinner",
                  "uncertainFields": [],
                  "languageDetected": "sv"
                }
                """;
        return new AnthropicMessageResponse(
                "msg_test",
                "message",
                "assistant",
                "claude-test",
                "end_turn",
                List.of(new AnthropicMessageResponse.ContentBlock("text", json)),
                new AnthropicMessageResponse.Usage(100, 200));
    }
}
