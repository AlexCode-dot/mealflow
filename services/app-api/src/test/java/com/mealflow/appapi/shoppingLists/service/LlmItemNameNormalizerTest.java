package com.mealflow.appapi.shoppingLists.service;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mealflow.appapi.recipes.extraction.client.AnthropicClient;
import com.mealflow.appapi.recipes.extraction.client.AnthropicMessageResponse;
import com.mealflow.appapi.recipes.extraction.config.AnthropicProperties;
import com.mealflow.appapi.shoppingLists.domain.ShoppingItemCategory;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class LlmItemNameNormalizerTest {

    private final AnthropicClient client = mock(AnthropicClient.class);

    private LlmItemNameNormalizer normalizer(boolean configured) {
        AnthropicProperties props = new AnthropicProperties();
        if (configured) {
            props.setApiKey("test-key");
        }
        return new LlmItemNameNormalizer(client, props, new ObjectMapper());
    }

    private static AnthropicMessageResponse reply(String text) {
        return new AnthropicMessageResponse(
                "id",
                "message",
                "assistant",
                "model",
                "end_turn",
                List.of(new AnthropicMessageResponse.ContentBlock("text", text)),
                null);
    }

    @Test
    void mapsEachRawNameToItsProductName_andAisle() {
        when(client.createMessage(any())).thenReturn(reply("""
                {"1":["Gul lök","produce"],"2":["Gul lök","produce"],"3":["Ägg","dairy"]}
                """));

        Map<String, NormalizedItemName> result =
                normalizer(true).normalize(List.of("finhackad gul lök", "Gul lök", "ägg, uppvispade"));

        assertThat(
                result.get("finhackad gul lök"), is(new NormalizedItemName("Gul lök", ShoppingItemCategory.PRODUCE)));
        assertThat(result.get("Gul lök").name(), is("Gul lök"));
        assertThat(result.get("ägg, uppvispade"), is(new NormalizedItemName("Ägg", ShoppingItemCategory.DAIRY)));
    }

    @Test
    void skipsEntriesItCantTrust_andKeepsTheRest() {
        when(client.createMessage(any())).thenReturn(reply("""
                Here you go:
                {"1":["Tomater","produce"],"2":["", "pantry"],"3":"Salt","4":["%s","pantry"]}
                """.formatted("x".repeat(200))));

        Map<String, NormalizedItemName> result = normalizer(true).normalize(List.of("tomat", "mjöl", "salt", "lång"));

        assertThat(result.keySet(), contains("tomat"));
    }

    @Test
    void failsSoft_whenTheCallFailsOrTheReplyIsUnreadable() {
        when(client.createMessage(any()))
                .thenThrow(new RuntimeException("timeout"))
                .thenReturn(reply("not json at all"));

        assertThat(normalizer(true).normalize(List.of("tomat")), anEmptyMap());
        assertThat(normalizer(true).normalize(List.of("tomat")), anEmptyMap());
    }

    @Test
    void makesNoCall_withoutAnApiKey() {
        assertThat(normalizer(false).normalize(List.of("tomat")), anEmptyMap());
        verify(client, never()).createMessage(any());
    }
}
