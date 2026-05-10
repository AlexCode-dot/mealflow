package com.mealflow.appapi.recipes.extraction.client;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AnthropicMessageRequest(
        String model,
        @JsonProperty("max_tokens") int maxTokens,
        String system,
        List<Message> messages,
        Double temperature) {

    public record Message(String role, List<ContentBlock> content) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ContentBlock(String type, String text, ImageSource source) {

        public static ContentBlock text(String text) {
            return new ContentBlock("text", text, null);
        }

        public static ContentBlock image(String mediaType, String base64Data) {
            return new ContentBlock("image", null, new ImageSource("base64", mediaType, base64Data));
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ImageSource(
            String type, @JsonProperty("media_type") String mediaType, String data) {}
}
