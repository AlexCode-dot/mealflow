package com.mealflow.appapi.recipes.extraction.web;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.appapi.recipes.extraction.client.AnthropicClient;
import com.mealflow.appapi.recipes.extraction.client.AnthropicMessageResponse;
import com.mealflow.appapi.recipes.image.PexelsClient;
import com.mealflow.appapi.recipes.image.PexelsPhoto;
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

    @MockitoBean
    private PexelsClient pexelsClient;

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

    /**
     * The media-less flows (voice/search) get a Pexels stock photo, whose attribution must reach
     * the app via the job response and follow the photo onto the recipe when the draft is accepted.
     */
    @Test
    void textExtraction_returnsPhotoAttribution_thatFollowsTheAcceptedRecipe() throws Exception {
        when(anthropicClient.createMessage(any())).thenReturn(cannedResponseWithPhotoQuery());
        when(pexelsClient.findPhoto("creamy chicken skillet"))
                .thenReturn(new PexelsPhoto(
                        "https://images.pexels.com/photos/1/large.jpg",
                        "Anna Ek",
                        "https://www.pexels.com/@anna-ek",
                        "https://www.pexels.com/photo/creamy-chicken-1"));

        String token = tokens.issue("user-extract-attribution");
        HttpRequest start = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/api/recipes/extract/text"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .POST(BodyPublishers.ofString("{\"transcript\":\"pasta med kyckling\",\"locale\":\"sv-SE\"}"))
                .build();
        HttpResponse<String> started = http.send(start, BodyHandlers.ofString());
        assertThat(started.statusCode(), is(202));
        String jobId = JsonPath.read(started.body(), "$.jobId");

        String ready = pollUntilTerminal(token, jobId);
        assertThat(JsonPath.read(ready, "$.status").toString(), is("READY"));
        assertThat(
                JsonPath.read(ready, "$.thumbnailUrl").toString(), is("https://images.pexels.com/photos/1/large.jpg"));
        assertThat(JsonPath.read(ready, "$.thumbnailAttribution.provider").toString(), is("pexels"));
        assertThat(JsonPath.read(ready, "$.thumbnailAttribution.photographer").toString(), is("Anna Ek"));
        assertThat(
                JsonPath.read(ready, "$.thumbnailAttribution.photographerUrl").toString(),
                is("https://www.pexels.com/@anna-ek"));
        assertThat(
                JsonPath.read(ready, "$.thumbnailAttribution.sourceUrl").toString(),
                is("https://www.pexels.com/photo/creamy-chicken-1"));

        // The app echoes the attribution back when the user keeps the suggested photo.
        String acceptBody = """
                {
                  "title": "Pasta med kyckling",
                  "imageUrl": "https://images.pexels.com/photos/1/large.jpg",
                  "imageAttribution": {
                    "provider": "pexels",
                    "photographer": "Anna Ek",
                    "photographerUrl": "https://www.pexels.com/@anna-ek",
                    "sourceUrl": "https://www.pexels.com/photo/creamy-chicken-1"
                  },
                  "ingredients": [{"name":"Spaghetti","quantity":400,"unit":"g"}],
                  "steps": ["Koka pastan"]
                }
                """;
        HttpRequest accept = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:" + port + "/api/recipes/extract/" + jobId + "/accept"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .POST(BodyPublishers.ofString(acceptBody))
                .build();
        HttpResponse<String> accepted = http.send(accept, BodyHandlers.ofString());
        assertThat(accepted.statusCode(), is(201));
        assertThat(JsonPath.read(accepted.body(), "$.imageAttribution.provider").toString(), is("pexels"));
        assertThat(
                JsonPath.read(accepted.body(), "$.imageAttribution.photographer")
                        .toString(),
                is("Anna Ek"));
        assertThat(
                JsonPath.read(accepted.body(), "$.imageAttribution.sourceUrl").toString(),
                is("https://www.pexels.com/photo/creamy-chicken-1"));
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

    /** The media-less prompts also ask the model for a photoQuery to look up on Pexels. */
    private AnthropicMessageResponse cannedResponseWithPhotoQuery() {
        String json = """
                {
                  "title": "Pasta med kyckling",
                  "description": "Snabb pasta",
                  "ingredients": [{"name":"Spaghetti","quantity":400,"unit":"g"}],
                  "steps": ["Koka pastan"],
                  "cookingTimeMinutes": 20,
                  "portions": 4,
                  "category": "dinner",
                  "uncertainFields": [],
                  "languageDetected": "sv",
                  "photoQuery": "creamy chicken skillet"
                }
                """;
        return textResponse(json);
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
        return textResponse(json);
    }

    private AnthropicMessageResponse textResponse(String json) {
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
