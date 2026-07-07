package com.mealflow.appapi.recipes.extraction.service;

import com.mealflow.appapi.recipes.extraction.client.AnthropicClient;
import com.mealflow.appapi.recipes.extraction.client.AnthropicMessageRequest;
import com.mealflow.appapi.recipes.extraction.client.AnthropicMessageRequest.ContentBlock;
import com.mealflow.appapi.recipes.extraction.client.AnthropicMessageResponse;
import com.mealflow.appapi.recipes.extraction.config.AnthropicProperties;
import com.mealflow.appapi.recipes.extraction.domain.RecipeDraft;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class LlmRecipeExtractor {

    private static final Logger log = LoggerFactory.getLogger(LlmRecipeExtractor.class);

    private static final String EXTRACTION_RULES = """
            OUTPUT REQUIREMENTS:
            - All text fields (title, description, ingredient names, steps, category) MUST be in %s, regardless of the source language. Translate if needed.
            - All quantities MUST use the %s system.
              - metric units to use: g, kg, ml, dl, l, msk (tablespoon), tsk (teaspoon), st (piece)
              - imperial units to use: oz, lb, tsp, tbsp, cup, fl oz
            - If a quantity or unit is not stated in the source, ESTIMATE a sensible value from the dish, the cooking steps, and standard recipes for this kind of food, scaled to the portion count. Use common, rounded amounts a home cook expects (e.g. 2 dl, 1 msk, 1 st).
            - Every value you ESTIMATED rather than read directly from the source MUST be listed in uncertainFields, by ingredient name (or 'cookingTimeMinutes' / 'portions'), so the user can review and confirm.
            - For each ingredient, set "estimated" to true when you estimated its quantity or unit rather than reading it from the source; otherwise false.
            - Only leave a quantity or unit null if you genuinely cannot make a reasonable estimate even after considering the dish and steps.
            - cookingTimeMinutes: total active + passive minutes, integer. null if unknown.
            - portions: integer count. If not stated, assume 4, set portions to 4, and add 'portions' to uncertainFields. Scale all estimated ingredient amounts to this portion count.
            - title: short and descriptive, max 80 chars. No emoji.
            - steps: ordered list of plain-text instructions, max 15 steps, each max 400 chars. No numbering prefixes.
            - category: one of "breakfast", "lunch", "dinner", "dessert", "snack", "drink", "side", "other". null if unknown.

            OUTPUT FORMAT:
            Respond with ONLY a single JSON object, no prose, no markdown fences.
            Schema:
            {
              "title": string,
              "description": string|null,
              "ingredients": [{"name": string, "quantity": number|null, "unit": string|null, "estimated": boolean}],
              "steps": [string],
              "cookingTimeMinutes": number|null,
              "portions": number|null,
              "category": string|null,
              "uncertainFields": [string],
              "languageDetected": string
            }
            """;

    private static final String SYSTEM_PROMPT =
            "You are a recipe extractor. The user has provided one or more images from a cooking video or a recipe photo.\n\n"
                    + EXTRACTION_RULES;

    private static final String TEXT_SYSTEM_PROMPT =
            "You are a recipe extractor. The user dictated a recipe out loud; the text below is a transcript of what they"
                    + " said. It may be casual and conversational, in any language, and contain filler words or asides —"
                    + " ignore anything that isn't part of the recipe.\n\n"
                    + EXTRACTION_RULES;

    private final AnthropicClient anthropicClient;
    private final AnthropicProperties anthropicProperties;
    private final ObjectMapper objectMapper;

    public LlmRecipeExtractor(
            AnthropicClient anthropicClient, AnthropicProperties anthropicProperties, ObjectMapper objectMapper) {
        this.anthropicClient = anthropicClient;
        this.anthropicProperties = anthropicProperties;
        this.objectMapper = objectMapper;
    }

    public RecipeDraft extract(List<ExtractedFrame> frames, String outputLanguageName, String unitSystem) {
        if (frames == null || frames.isEmpty()) {
            throw new ExtractionValidationException("No frames available for extraction.");
        }

        List<ContentBlock> userBlocks = new ArrayList<>();
        for (ExtractedFrame frame : frames) {
            userBlocks.add(ContentBlock.image(frame.mediaType(), encode(frame.path())));
        }
        userBlocks.add(
                ContentBlock.text("Extract the recipe from these images according to the rules. Output JSON only."));

        AnthropicMessageRequest request = new AnthropicMessageRequest(
                anthropicProperties.getModel(),
                anthropicProperties.getMaxTokens(),
                String.format(Locale.ROOT, SYSTEM_PROMPT, outputLanguageName, unitSystem),
                List.of(new AnthropicMessageRequest.Message("user", userBlocks)),
                0.0);

        AnthropicMessageResponse response = anthropicClient.createMessage(request);
        String text = response.firstText();
        if (text == null || text.isBlank()) {
            throw new ExtractionValidationException("Could not read recipe from media. Try a clearer source.");
        }
        return parse(text);
    }

    public RecipeDraft extractFromText(String transcript, String outputLanguageName, String unitSystem) {
        if (transcript == null || transcript.isBlank()) {
            throw new ExtractionValidationException("No transcript to build a recipe from.");
        }

        List<ContentBlock> userBlocks = List.of(ContentBlock.text("Transcript:\n" + transcript
                + "\n\nBuild the recipe from this transcript according to the rules. Output JSON only."));

        AnthropicMessageRequest request = new AnthropicMessageRequest(
                anthropicProperties.getModel(),
                anthropicProperties.getMaxTokens(),
                String.format(Locale.ROOT, TEXT_SYSTEM_PROMPT, outputLanguageName, unitSystem),
                List.of(new AnthropicMessageRequest.Message("user", userBlocks)),
                0.0);

        AnthropicMessageResponse response = anthropicClient.createMessage(request);
        String text = response.firstText();
        if (text == null || text.isBlank()) {
            throw new ExtractionValidationException("Could not build a recipe from what you said. Try again.");
        }
        return parse(text);
    }

    public RecipeDraft parse(String text) {
        String json = stripFences(text);
        try {
            JsonNode root = objectMapper.readTree(json);
            RecipeDraft draft = new RecipeDraft();
            draft.setTitle(textOrNull(root.path("title")));
            draft.setDescription(textOrNull(root.path("description")));
            draft.setCookingTimeMinutes(intOrNull(root.path("cookingTimeMinutes")));
            draft.setPortions(intOrNull(root.path("portions")));
            draft.setCategory(textOrNull(root.path("category")));
            draft.setLanguage(textOrNull(root.path("languageDetected")));
            draft.setSteps(stringList(root.path("steps")));
            draft.setUncertainFields(stringList(root.path("uncertainFields")));

            List<RecipeDraft.DraftIngredient> ingredients = new ArrayList<>();
            JsonNode ingredientsNode = root.path("ingredients");
            if (ingredientsNode.isArray()) {
                for (JsonNode node : ingredientsNode) {
                    String name = textOrNull(node.path("name"));
                    if (name == null || name.isBlank()) {
                        continue;
                    }
                    Double quantity = doubleOrNull(node.path("quantity"));
                    String unit = textOrNull(node.path("unit"));
                    boolean estimated = node.path("estimated").asBoolean(false);
                    ingredients.add(new RecipeDraft.DraftIngredient(name.trim(), quantity, unit, estimated));
                }
            }
            draft.setIngredients(ingredients);

            if (draft.getTitle() == null || draft.getTitle().isBlank()) {
                throw new ExtractionValidationException("Recipe title could not be determined.");
            }
            return draft;
        } catch (ExtractionValidationException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Failed to parse LLM response: {}", ex.getMessage());
            throw new ExtractionValidationException("Could not interpret the recipe. Try a clearer source.");
        }
    }

    private String encode(Path path) {
        try {
            return Base64.getEncoder().encodeToString(Files.readAllBytes(path));
        } catch (IOException ex) {
            throw new ExtractionValidationException("Could not read frame data.");
        }
    }

    private String stripFences(String text) {
        String trimmed = text.trim();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            if (firstNewline > 0) {
                trimmed = trimmed.substring(firstNewline + 1);
            }
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.length() - 3);
            }
        }
        int braceStart = trimmed.indexOf('{');
        int braceEnd = trimmed.lastIndexOf('}');
        if (braceStart >= 0 && braceEnd > braceStart) {
            return trimmed.substring(braceStart, braceEnd + 1);
        }
        return trimmed;
    }

    private String textOrNull(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        if (node.isTextual()) {
            String value = node.asText();
            return value.isBlank() ? null : value;
        }
        return null;
    }

    private Integer intOrNull(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        if (node.isNumber()) {
            return node.asInt();
        }
        return null;
    }

    private Double doubleOrNull(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        if (node.isNumber()) {
            return node.asDouble();
        }
        return null;
    }

    private List<String> stringList(JsonNode node) {
        List<String> list = new ArrayList<>();
        if (node == null || !node.isArray()) {
            return list;
        }
        for (JsonNode child : node) {
            if (child.isTextual()) {
                String value = child.asText();
                if (!value.isBlank()) {
                    list.add(value.trim());
                }
            }
        }
        return list;
    }
}
