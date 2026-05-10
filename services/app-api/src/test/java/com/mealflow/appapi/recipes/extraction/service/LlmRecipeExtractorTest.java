package com.mealflow.appapi.recipes.extraction.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.mealflow.appapi.recipes.extraction.client.AnthropicClient;
import com.mealflow.appapi.recipes.extraction.config.AnthropicProperties;
import com.mealflow.appapi.recipes.extraction.domain.RecipeDraft;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class LlmRecipeExtractorTest {

    private final LlmRecipeExtractor extractor =
            new LlmRecipeExtractor(mock(AnthropicClient.class), new AnthropicProperties(), new ObjectMapper());

    @Test
    void parsesCleanJson() {
        String json = """
                {
                  "title": "Pasta Carbonara",
                  "description": "Classic Roman pasta",
                  "ingredients": [
                    {"name": "Spaghetti", "quantity": 400, "unit": "g"},
                    {"name": "Salt", "quantity": null, "unit": null}
                  ],
                  "steps": ["Boil water", "Cook pasta"],
                  "cookingTimeMinutes": 25,
                  "portions": 4,
                  "category": "dinner",
                  "uncertainFields": ["Salt"],
                  "languageDetected": "en"
                }
                """;
        RecipeDraft draft = extractor.parse(json);
        assertThat(draft.getTitle()).isEqualTo("Pasta Carbonara");
        assertThat(draft.getIngredients()).hasSize(2);
        assertThat(draft.getIngredients().get(0).getName()).isEqualTo("Spaghetti");
        assertThat(draft.getIngredients().get(0).getQuantity()).isEqualTo(400.0);
        assertThat(draft.getIngredients().get(1).getQuantity()).isNull();
        assertThat(draft.getSteps()).hasSize(2);
        assertThat(draft.getCookingTimeMinutes()).isEqualTo(25);
        assertThat(draft.getPortions()).isEqualTo(4);
        assertThat(draft.getCategory()).isEqualTo("dinner");
        assertThat(draft.getLanguage()).isEqualTo("en");
        assertThat(draft.getUncertainFields()).containsExactly("Salt");
    }

    @Test
    void parsesJsonWrappedInMarkdownFences() {
        String json = """
                ```json
                {"title": "Tacos", "ingredients": [], "steps": []}
                ```
                """;
        RecipeDraft draft = extractor.parse(json);
        assertThat(draft.getTitle()).isEqualTo("Tacos");
    }

    @Test
    void parsesJsonWithLeadingProse() {
        String text = "Here is the recipe: {\"title\":\"Pizza\",\"ingredients\":[],\"steps\":[]}";
        RecipeDraft draft = extractor.parse(text);
        assertThat(draft.getTitle()).isEqualTo("Pizza");
    }

    @Test
    void rejectsResponseWithoutTitle() {
        String json = "{\"title\": null, \"ingredients\": [], \"steps\": []}";
        assertThatThrownBy(() -> extractor.parse(json)).isInstanceOf(ExtractionValidationException.class);
    }

    @Test
    void rejectsMalformedJson() {
        assertThatThrownBy(() -> extractor.parse("{not json")).isInstanceOf(ExtractionValidationException.class);
    }

    @Test
    void skipsIngredientsWithoutName() {
        String json = """
                {
                  "title": "Soup",
                  "ingredients": [
                    {"name": "", "quantity": 1, "unit": "l"},
                    {"name": "Onion", "quantity": 1, "unit": "st"}
                  ],
                  "steps": []
                }
                """;
        RecipeDraft draft = extractor.parse(json);
        assertThat(draft.getIngredients()).hasSize(1);
        assertThat(draft.getIngredients().get(0).getName()).isEqualTo("Onion");
    }
}
