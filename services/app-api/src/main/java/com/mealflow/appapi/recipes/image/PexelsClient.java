package com.mealflow.appapi.recipes.image;

import com.mealflow.appapi.monitoring.ExternalApiReporter;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Looks up a stock food photo on Pexels for recipes that have no source image of their own —
 * the spoken and searched flows, where the user never supplied a picture.
 *
 * <p>The photo is illustrative, not a picture of the user's actual dish, so a miss is never an
 * error: every failure path returns null and the recipe simply stays image-less as before.
 */
@Component
public class PexelsClient {

    private static final Logger log = LoggerFactory.getLogger(PexelsClient.class);

    private final RestClient restClient;
    private final String apiKey;

    @Autowired
    public PexelsClient(
            RestClient.Builder restClientBuilder,
            @Value("${app.images.pexels.base-url}") String baseUrl,
            @Value("${app.images.pexels.api-key}") String apiKey,
            @Value("${app.images.pexels.request-timeout-seconds}") int timeoutSeconds) {
        this(build(restClientBuilder, baseUrl, timeoutSeconds), apiKey);
    }

    /**
     * A missing photo must never hold up an extraction the user is waiting on, so this call gets a
     * much shorter leash than the LLM request that precedes it.
     */
    private static RestClient build(RestClient.Builder builder, String baseUrl, int timeoutSeconds) {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(timeoutSeconds));
        requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        return builder.baseUrl(baseUrl).requestFactory(requestFactory).build();
    }

    /** Takes a ready-made client so tests can supply one bound to a mock server. */
    PexelsClient(RestClient restClient, String apiKey) {
        this.restClient = restClient;
        this.apiKey = apiKey;
        if (!isEnabled()) {
            log.info("Pexels photo lookup disabled — no API key configured.");
        }
    }

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Return the URL of a landscape food photo matching the query, or null when lookup is
     * disabled, the query is empty, nothing matches, or the call fails.
     */
    public String findPhotoUrl(String query) {
        if (!isEnabled() || query == null || query.isBlank()) {
            return null;
        }
        try {
            PexelsPhotoResponse response = restClient
                    .get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1/search")
                            .queryParam("query", query)
                            .queryParam("per_page", 1)
                            .queryParam("orientation", "landscape")
                            .build())
                    .header("Authorization", apiKey)
                    .retrieve()
                    .body(PexelsPhotoResponse.class);

            if (response == null
                    || response.photos() == null
                    || response.photos().isEmpty()) {
                return null;
            }
            var src = response.photos().get(0).src();
            return src == null ? null : src.best();
        } catch (RestClientException ex) {
            ExternalApiReporter.captureFailure("pexels", "search", ex);
            log.warn("Pexels lookup failed for \"{}\": {}", query, ex.getMessage());
            return null;
        } catch (RuntimeException ex) {
            log.warn("Pexels lookup failed for \"{}\": {}", query, ex.getMessage());
            return null;
        }
    }
}
