package com.mealflow.appapi.shoppingLists.service;

import com.mealflow.appapi.recipes.extraction.client.AnthropicClient;
import com.mealflow.appapi.recipes.extraction.client.AnthropicMessageRequest;
import com.mealflow.appapi.recipes.extraction.client.AnthropicMessageRequest.ContentBlock;
import com.mealflow.appapi.recipes.extraction.client.AnthropicMessageResponse;
import com.mealflow.appapi.recipes.extraction.config.AnthropicProperties;
import com.mealflow.appapi.shoppingLists.domain.ShoppingItemCategory;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Categorizes grocery items the keyword lookup didn't recognise, in one batched LLM call.
 *
 * <p>Deliberately fail-soft: if Anthropic isn't configured, the call fails, or the response can't
 * be parsed, we return what we have and the caller falls back to OTHER. Categorisation is a
 * convenience — it must never block someone from generating a shopping list.
 */
@Service
public class LlmItemCategorizer {

    private static final Logger log = LoggerFactory.getLogger(LlmItemCategorizer.class);

    /** Guard rail so a huge list can't turn into an oversized prompt. */
    private static final int MAX_ITEMS_PER_CALL = 60;

    private static final String SYSTEM_PROMPT = """
            You sort grocery items into supermarket aisles.

            For every item name you are given, respond with the aisle it belongs to. Item names may be
            in Swedish or English.

            Allowed categories:
            - "produce" — fruit, vegetables, fresh herbs
            - "meat" — meat, poultry, charcuterie, sausage
            - "fish" — fish and seafood
            - "dairy" — milk, cream, butter, cheese, yoghurt, eggs
            - "bread" — bread and bakery
            - "pantry" — dry goods, tins, spices, oil, sauces, baking, snacks
            - "frozen" — frozen goods
            - "drinks" — beverages
            - "other" — anything that fits nowhere above (non-food, unclear)

            OUTPUT FORMAT:
            Respond with ONLY a single JSON object, no prose, no markdown fences, mapping each item
            name EXACTLY as given to its category string.
            Example: {"gul lök":"produce","havssalt":"pantry"}
            """;

    private final AnthropicClient anthropicClient;
    private final AnthropicProperties anthropicProperties;
    private final ObjectMapper objectMapper;

    public LlmItemCategorizer(
            AnthropicClient anthropicClient, AnthropicProperties anthropicProperties, ObjectMapper objectMapper) {
        this.anthropicClient = anthropicClient;
        this.anthropicProperties = anthropicProperties;
        this.objectMapper = objectMapper;
    }

    /** Returns a name → category map. Names that couldn't be categorized are simply absent. */
    public Map<String, ShoppingItemCategory> categorize(List<String> names) {
        Map<String, ShoppingItemCategory> result = new LinkedHashMap<>();
        if (names == null || names.isEmpty() || !anthropicProperties.isConfigured()) {
            return result;
        }

        List<String> batch = names.size() > MAX_ITEMS_PER_CALL ? names.subList(0, MAX_ITEMS_PER_CALL) : names;
        try {
            String joined = String.join("\n", batch);
            AnthropicMessageRequest request = new AnthropicMessageRequest(
                    anthropicProperties.getModel(),
                    anthropicProperties.getMaxTokens(),
                    SYSTEM_PROMPT,
                    List.of(new AnthropicMessageRequest.Message(
                            "user", List.of(ContentBlock.text("Items:\n" + joined + "\n\nOutput JSON only.")))),
                    0.0);

            AnthropicMessageResponse response = anthropicClient.createMessage(request);
            String text = response.firstText();
            if (text == null || text.isBlank()) {
                return result;
            }

            JsonNode root = objectMapper.readTree(stripFences(text));
            if (!root.isObject()) {
                return result;
            }
            for (String name : batch) {
                JsonNode node = root.path(name);
                if (node.isString()) {
                    result.put(name, ShoppingItemCategory.fromValue(node.asString()));
                }
            }
        } catch (RuntimeException ex) {
            // Never break list generation over categorisation.
            log.warn("Item categorization failed, falling back to OTHER: {}", ex.getMessage());
        }
        return result;
    }

    private String stripFences(String text) {
        String trimmed = text.trim();
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1);
        }
        return trimmed;
    }
}
