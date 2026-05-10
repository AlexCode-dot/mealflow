package com.mealflow.appapi.recipes.extraction.client;

import com.mealflow.appapi.monitoring.ExternalApiReporter;
import com.mealflow.appapi.recipes.extraction.config.AnthropicProperties;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class AnthropicClient {

    private static final Logger log = LoggerFactory.getLogger(AnthropicClient.class);

    private final AnthropicProperties properties;
    private final RestClient restClient;

    public AnthropicClient(AnthropicProperties properties, RestClient.Builder builder) {
        this.properties = properties;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(10).toMillis());
        factory.setReadTimeout(
                (int) Duration.ofSeconds(properties.getRequestTimeoutSeconds()).toMillis());
        this.restClient =
                builder.baseUrl(properties.getBaseUrl()).requestFactory(factory).build();
    }

    public AnthropicMessageResponse createMessage(AnthropicMessageRequest request) {
        if (!properties.isConfigured()) {
            throw new AnthropicException("Anthropic API is not configured.");
        }
        try {
            AnthropicMessageResponse response = restClient
                    .post()
                    .uri("/v1/messages")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("x-api-key", properties.getApiKey())
                    .header("anthropic-version", properties.getAnthropicVersion())
                    .body(request)
                    .retrieve()
                    .body(AnthropicMessageResponse.class);

            if (response == null) {
                throw new AnthropicException("Empty response from Anthropic API.");
            }
            return response;
        } catch (RestClientException ex) {
            log.warn("Anthropic API call failed: {}", ex.getMessage());
            ExternalApiReporter.captureFailure("anthropic", "messages", ex);
            throw new AnthropicException("Anthropic API call failed.", ex);
        }
    }
}
