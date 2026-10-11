package com.mealflow.appapi.integrations.v1;

import com.mealflow.appapi.integrations.v1.dto.CreateRecipeBody;
import com.mealflow.appapi.integrations.v1.dto.RecipeDto;
import com.mealflow.appapi.integrations.v1.dto.RecipePageDto;
import com.mealflow.appapi.integrations.v1.dto.RecipeSummaryDto;
import com.mealflow.appapi.integrations.v1.dto.UpdateRecipeBody;
import com.mealflow.appapi.recipes.domain.Ingredient;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.service.RecipeService;
import com.mealflow.appapi.recipes.service.RecipeValidationException;
import com.mealflow.appapi.recipes.web.dto.IngredientDto;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/** Recipe operations for the integration API. Every query is scoped to the token's user. */
@Service
public class IntegrationRecipeService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;
    private static final int MAX_QUERY_LENGTH = 100;

    private final RecipeService recipeService;
    private final MongoTemplate mongo;
    private final Clock clock;

    public IntegrationRecipeService(RecipeService recipeService, MongoTemplate mongo, Clock clock) {
        this.recipeService = recipeService;
        this.mongo = mongo;
        this.clock = clock;
    }

    public RecipePageDto list(String userId, String q, Integer limit, String cursor) {
        int safeLimit = limit == null ? DEFAULT_LIMIT : limit;
        if (safeLimit < 1 || safeLimit > MAX_LIMIT) {
            throw IntegrationApiException.badRequest("limit must be between 1 and " + MAX_LIMIT);
        }
        int offset = decodeCursor(cursor);

        Criteria criteria = Criteria.where("userId").is(userId);
        if (q != null && !q.isBlank()) {
            String term = q.trim();
            if (term.length() > MAX_QUERY_LENGTH) {
                throw IntegrationApiException.badRequest("q must be at most " + MAX_QUERY_LENGTH + " characters");
            }
            Pattern pattern = Pattern.compile(Pattern.quote(term), Pattern.CASE_INSENSITIVE);
            criteria = criteria.orOperator(
                    Criteria.where("title").regex(pattern),
                    Criteria.where("tags").regex(pattern));
        }
        Query query = Query.query(criteria)
                .with(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")))
                .skip(offset)
                .limit(safeLimit + 1);
        List<Recipe> found = mongo.find(query, Recipe.class);

        boolean hasMore = found.size() > safeLimit;
        List<RecipeSummaryDto> items = found.stream()
                .limit(safeLimit)
                .map(IntegrationRecipeService::toSummary)
                .toList();
        return new RecipePageDto(items, hasMore ? encodeCursor(offset + safeLimit) : null);
    }

    public Recipe get(String userId, String recipeId) {
        return recipeService.getForUser(userId, recipeId);
    }

    public Recipe create(String userId, CreateRecipeBody body) {
        return recipeService.create(
                userId,
                body.title().trim(),
                body.description(),
                null,
                null,
                null,
                null,
                toIngredients(body.ingredients()),
                body.steps(),
                body.cookingTimeMinutes(),
                body.portions(),
                body.category(),
                body.tags(),
                false,
                null);
    }

    public Recipe update(String userId, String recipeId, UpdateRecipeBody body, String ifMatch) {
        if (body.title() != null && body.title().isBlank()) {
            throw new RecipeValidationException("title must not be blank");
        }
        Recipe recipe = recipeService.getForUser(userId, recipeId);
        Versioning.checkIfMatch(ifMatch, recipe.getUpdatedAt());

        Instant previous = recipe.getUpdatedAt();
        Instant next = Versioning.next(previous, clock);
        recipe.applyPatch(
                body.title(),
                body.description(),
                null,
                null,
                toIngredients(body.ingredients()),
                body.steps(),
                body.cookingTimeMinutes(),
                body.portions(),
                body.category(),
                body.tags() == null ? null : recipeService.normalizeTags(body.tags()),
                null,
                null,
                next);

        Update update = new Update()
                .set("title", recipe.getTitle())
                .set("description", recipe.getDescription())
                .set("ingredients", recipe.getIngredients())
                .set("steps", recipe.getSteps())
                .set("cookingTimeMinutes", recipe.getCookingTimeMinutes())
                .set("portions", recipe.getPortions())
                .set("category", recipe.getCategory())
                .set("tags", recipe.getTags())
                .set("updatedAt", next);
        Versioning.compareAndSet(mongo, Recipe.class, recipe.getId(), userId, previous, update);
        return recipe;
    }

    public static RecipeDto toDto(Recipe r) {
        return new RecipeDto(
                r.getId(),
                r.getTitle(),
                r.getDescription(),
                r.getIngredients() == null
                        ? List.of()
                        : r.getIngredients().stream()
                                .map(i -> new IngredientDto(i.getName(), i.getQuantity(), i.getUnit()))
                                .toList(),
                r.getSteps() == null ? List.of() : r.getSteps(),
                r.getCookingTimeMinutes(),
                r.getPortions(),
                r.getCategory(),
                r.getTags(),
                r.getImageUrl(),
                r.getCreatedAt(),
                r.getUpdatedAt(),
                Versioning.version(r.getUpdatedAt()));
    }

    private static RecipeSummaryDto toSummary(Recipe r) {
        return new RecipeSummaryDto(
                r.getId(),
                r.getTitle(),
                r.getCategory(),
                r.getTags(),
                r.getCookingTimeMinutes(),
                r.getPortions(),
                r.getImageUrl(),
                r.getUpdatedAt(),
                Versioning.version(r.getUpdatedAt()));
    }

    private static List<Ingredient> toIngredients(List<IngredientDto> dtos) {
        if (dtos == null) {
            return null;
        }
        return dtos.stream()
                .map(d -> new Ingredient(d.name().trim(), d.quantity(), d.unit()))
                .toList();
    }

    private static String encodeCursor(int offset) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(("o:" + offset).getBytes(StandardCharsets.UTF_8));
    }

    private static int decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return 0;
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor.trim()), StandardCharsets.UTF_8);
            if (!raw.startsWith("o:")) {
                throw IntegrationApiException.badRequest("cursor is invalid");
            }
            int offset = Integer.parseInt(raw.substring(2));
            if (offset < 0) {
                throw IntegrationApiException.badRequest("cursor is invalid");
            }
            return offset;
        } catch (IllegalArgumentException ex) {
            throw IntegrationApiException.badRequest("cursor is invalid");
        }
    }
}
