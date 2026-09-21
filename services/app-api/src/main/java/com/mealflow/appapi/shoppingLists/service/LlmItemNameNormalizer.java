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
 * Turns the ingredient names from a week of recipes into the names of the products to buy, in one
 * batched LLM call, so the same product used by several recipes ends up on one shopping line:
 * "ägg, uppvispade" and "Ägg", or "tomat" and "tomater". The aisle comes back from the same call,
 * which saves the separate categorisation call for most items.
 *
 * <p>Fail-soft like {@link LlmItemCategorizer}: with no API key, a failed call or an unreadable
 * reply, names are simply missing from the result and the list merges on exact names instead.
 */
@Service
public class LlmItemNameNormalizer {

    private static final Logger log = LoggerFactory.getLogger(LlmItemNameNormalizer.class);

    /** A full week of recipes is typically 50–120 distinct names; beyond this, the rest stay as-is. */
    static final int MAX_NAMES_PER_CALL = 150;

    private static final int MAX_NAME_LENGTH = 80;

    /** The reply is one short entry per name; a full batch needs more room than the default. */
    private static final int MIN_MAX_TOKENS = 4096;

    private static final String SYSTEM_PROMPT = """
            You clean up ingredient names for a grocery shopping list, so the same product needed by
            several recipes ends up on one line of the list.

            For every numbered ingredient name, return the name of the product to buy and the
            supermarket aisle it is found in.

            Rules for the name:
            - Keep the language of the input. Never translate.
            - Drop preparation and serving notes that don't change what you buy: chopped, diced,
              grated, beaten, melted, softened, room temperature, to taste, for frying, divided,
              and the Swedish equivalents (hackad, finhackad, tärnad, riven, uppvispad, smält,
              rumstempererad, efter smak, till stekning, till servering).
            - Give the same product the identical name every time, so singular and plural variants
              match: "tomat" and "tomater" both become "Tomater", "egg" and "eggs" both "Eggs".
              Use the form a shopper would write on a list.
            - Keep every word that changes WHICH product you buy. Different products keep different
              names: rödlök, gul lök and schalottenlök; vispgrädde and matlagningsgrädde; krossade
              tomater and tomater; vetemjöl and rågmjöl; kycklingfilé and kycklinglår.
            - When unsure whether two names are the same product, keep them different. Two lines on
              the list is a small annoyance; merging two products makes someone buy the wrong thing.
            - Capitalise only the first letter, e.g. "Gul lök".

            Aisles:
            - "produce" — fruit, vegetables, fresh herbs
            - "meat" — meat, poultry, charcuterie, sausage, fish and seafood
            - "dairy" — milk, cream, butter, cheese, yoghurt, eggs
            - "bread" — bread and bakery
            - "pantry" — dry goods, tins, spices, oil, sauces, baking, snacks
            - "frozen" — frozen goods
            - "drinks" — beverages
            - "other" — anything that fits nowhere above

            OUTPUT FORMAT:
            Respond with ONLY a single JSON object mapping each input number, as a string, to a
            two-element array [name, aisle]. No prose, no markdown fences.

            Example input:
            1. finhackad gul lök
            2. Gul lök
            3. ägg, uppvispade
            4. rödlök
            Example output:
            {"1":["Gul lök","produce"],"2":["Gul lök","produce"],"3":["Ägg","dairy"],"4":["Rödlök","produce"]}
            """;

    private final AnthropicClient anthropicClient;
    private final AnthropicProperties anthropicProperties;
    private final ObjectMapper objectMapper;

    public LlmItemNameNormalizer(
            AnthropicClient anthropicClient, AnthropicProperties anthropicProperties, ObjectMapper objectMapper) {
        this.anthropicClient = anthropicClient;
        this.anthropicProperties = anthropicProperties;
        this.objectMapper = objectMapper;
    }

    /** Returns raw name → normalized name. Names that couldn't be normalized are simply absent. */
    public Map<String, NormalizedItemName> normalize(List<String> names) {
        Map<String, NormalizedItemName> result = new LinkedHashMap<>();
        if (names == null || names.isEmpty() || !anthropicProperties.isConfigured()) {
            return result;
        }

        List<String> batch = names.size() > MAX_NAMES_PER_CALL ? names.subList(0, MAX_NAMES_PER_CALL) : names;
        try {
            StringBuilder numbered = new StringBuilder();
            for (int i = 0; i < batch.size(); i++) {
                numbered.append(i + 1).append(". ").append(batch.get(i)).append('\n');
            }
            AnthropicMessageRequest request = new AnthropicMessageRequest(
                    anthropicProperties.getModel(),
                    Math.max(anthropicProperties.getMaxTokens(), MIN_MAX_TOKENS),
                    SYSTEM_PROMPT,
                    List.of(new AnthropicMessageRequest.Message(
                            "user",
                            List.of(ContentBlock.text("Ingredient names:\n" + numbered + "\nOutput JSON only.")))),
                    0.0);

            AnthropicMessageResponse response = anthropicClient.createMessage(request);
            return parse(response == null ? null : response.firstText(), batch);
        } catch (RuntimeException ex) {
            // Never break list generation over name cleanup.
            log.warn("Item name normalization failed, merging on exact names: {}", ex.getMessage());
            return result;
        }
    }

    Map<String, NormalizedItemName> parse(String text, List<String> batch) {
        Map<String, NormalizedItemName> result = new LinkedHashMap<>();
        if (text == null || text.isBlank()) {
            return result;
        }
        JsonNode root = objectMapper.readTree(stripFences(text));
        if (!root.isObject()) {
            return result;
        }
        for (int i = 0; i < batch.size(); i++) {
            JsonNode entry = root.path(String.valueOf(i + 1));
            if (!entry.isArray() || entry.size() < 1 || !entry.get(0).isString()) {
                continue;
            }
            String name = entry.get(0).asString().trim().replaceAll("\\s+", " ");
            if (name.isEmpty() || name.length() > MAX_NAME_LENGTH) {
                continue;
            }
            ShoppingItemCategory category = entry.size() > 1 && entry.get(1).isString()
                    ? ShoppingItemCategory.fromValue(entry.get(1).asString())
                    : null;
            result.put(batch.get(i), new NormalizedItemName(name, category));
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
