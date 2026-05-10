package com.mealflow.appapi.recipes.extraction.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AnthropicMessageResponse(
        String id,
        String type,
        String role,
        String model,
        @JsonProperty("stop_reason") String stopReason,
        List<ContentBlock> content,
        Usage usage) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ContentBlock(String type, String text) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Usage(
            @JsonProperty("input_tokens") Integer inputTokens,
            @JsonProperty("output_tokens") Integer outputTokens) {}

    public String firstText() {
        if (content == null) {
            return null;
        }
        return content.stream()
                .filter(c -> "text".equals(c.type()) && c.text() != null)
                .map(ContentBlock::text)
                .findFirst()
                .orElse(null);
    }
}
