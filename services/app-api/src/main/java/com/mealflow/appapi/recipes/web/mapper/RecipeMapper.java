package com.mealflow.appapi.recipes.web.mapper;

import com.mealflow.appapi.recipes.domain.ImageAttribution;
import com.mealflow.appapi.recipes.domain.ImageFocus;
import com.mealflow.appapi.recipes.domain.Ingredient;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.web.dto.CreateRecipeRequest;
import com.mealflow.appapi.recipes.web.dto.ImageAttributionDto;
import com.mealflow.appapi.recipes.web.dto.ImageFocusDto;
import com.mealflow.appapi.recipes.web.dto.IngredientDto;
import com.mealflow.appapi.recipes.web.dto.RecipeListItemResponse;
import com.mealflow.appapi.recipes.web.dto.RecipeResponse;
import com.mealflow.appapi.recipes.web.dto.UpdateRecipeRequest;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class RecipeMapper {

    public CreateArgs toCreateArgs(String userId, CreateRecipeRequest body) {
        List<Ingredient> ingredients = body.ingredients() == null
                ? List.of()
                : body.ingredients().stream().map(this::toDomain).toList();

        List<String> steps = body.steps() == null ? List.of() : body.steps();

        boolean fromExternal = body.fromExternal() != null && body.fromExternal();

        String category = body.category() == null ? null : body.category().trim();

        String imageUrl = body.imageUrl() == null ? null : body.imageUrl().trim();
        String imageFileId =
                body.imageFileId() == null ? null : body.imageFileId().trim();

        return new CreateArgs(
                userId,
                body.title().trim(),
                body.description(),
                imageUrl,
                imageFileId,
                toAttributionDomain(body.imageAttribution()),
                toFocusDomain(body.imageFocus()),
                ingredients,
                steps,
                body.cookingTimeMinutes(),
                body.portions(),
                category,
                body.tags(),
                fromExternal);
    }

    public PatchArgs toPatchArgs(String userId, String recipeId, UpdateRecipeRequest body) {
        List<Ingredient> ingredients = body.ingredients() == null
                ? null
                : body.ingredients().stream().map(this::toDomain).toList();

        String category = body.category() == null ? null : body.category().trim();

        String imageUrl = body.imageUrl() == null ? null : body.imageUrl().trim();
        String imageFileId =
                body.imageFileId() == null ? null : body.imageFileId().trim();

        return new PatchArgs(
                userId,
                recipeId,
                body.title(),
                body.description(),
                imageUrl,
                imageFileId,
                toAttributionDomain(body.imageAttribution()),
                toFocusDomain(body.imageFocus()),
                ingredients,
                body.steps(),
                body.cookingTimeMinutes(),
                body.portions(),
                category,
                body.tags(),
                body.fromExternal());
    }

    public RecipeResponse toResponse(Recipe r) {
        return new RecipeResponse(
                r.getId(),
                r.getTitle(),
                r.getDescription(),
                r.getImageUrl(),
                r.getImageFileId(),
                toAttributionDto(r.getImageAttribution()),
                toFocusDto(r.getImageFocus()),
                r.getIngredients().stream().map(this::toDto).toList(),
                r.getSteps(),
                r.getCookingTimeMinutes(),
                r.getPortions(),
                r.getCategory(),
                r.getTags(),
                r.isFromExternal(),
                r.getLanguage(),
                r.getCreatedAt(),
                r.getUpdatedAt());
    }

    public RecipeListItemResponse toListItem(Recipe r) {
        Integer ingredientCount =
                r.getIngredients() == null ? 0 : r.getIngredients().size();
        List<String> ingredientNames = r.getIngredients() == null
                ? List.of()
                : r.getIngredients().stream().map(Ingredient::getName).toList();
        return new RecipeListItemResponse(
                r.getId(),
                r.getTitle(),
                r.getDescription(),
                r.getImageUrl(),
                toFocusDto(r.getImageFocus()),
                r.getCookingTimeMinutes(),
                ingredientCount,
                r.getPortions(),
                ingredientNames,
                r.getCategory(),
                r.getTags(),
                r.isFromExternal());
    }

    /**
     * Trim the credit fields and drop the object entirely when every field is blank, so a recipe
     * never carries an empty attribution that the app would render as a bare caption.
     */
    public ImageAttribution toAttributionDomain(ImageAttributionDto dto) {
        if (dto == null) {
            return null;
        }
        String provider = trimToNull(dto.provider());
        String photographer = trimToNull(dto.photographer());
        String photographerUrl = trimToNull(dto.photographerUrl());
        String sourceUrl = trimToNull(dto.sourceUrl());
        if (provider == null && photographer == null && photographerUrl == null && sourceUrl == null) {
            return null;
        }
        return new ImageAttribution(provider, photographer, photographerUrl, sourceUrl);
    }

    public ImageAttributionDto toAttributionDto(ImageAttribution attribution) {
        if (attribution == null) {
            return null;
        }
        return new ImageAttributionDto(
                attribution.getProvider(),
                attribution.getPhotographer(),
                attribution.getPhotographerUrl(),
                attribution.getSourceUrl());
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Ingredient toDomain(IngredientDto dto) {
        String name = dto.name().trim();
        String unit = dto.unit() == null ? null : dto.unit().trim();
        return new Ingredient(name, dto.quantity(), unit);
    }

    public ImageFocus toFocusDomain(ImageFocusDto dto) {
        return dto == null ? null : new ImageFocus(dto.x(), dto.y(), dto.zoom());
    }

    public ImageFocusDto toFocusDto(ImageFocus focus) {
        return focus == null ? null : new ImageFocusDto(focus.getX(), focus.getY(), focus.getZoom());
    }

    private IngredientDto toDto(Ingredient ing) {
        return new IngredientDto(ing.getName(), ing.getQuantity(), ing.getUnit());
    }

    public record CreateArgs(
            String userId,
            String title,
            String description,
            String imageUrl,
            String imageFileId,
            ImageAttribution imageAttribution,
            ImageFocus imageFocus,
            List<Ingredient> ingredients,
            List<String> steps,
            Integer cookingTimeMinutes,
            Integer portions,
            String category,
            List<String> tags,
            boolean fromExternal) {}

    public record PatchArgs(
            String userId,
            String recipeId,
            String title,
            String description,
            String imageUrl,
            String imageFileId,
            ImageAttribution imageAttribution,
            ImageFocus imageFocus,
            List<Ingredient> ingredients,
            List<String> steps,
            Integer cookingTimeMinutes,
            Integer portions,
            String category,
            List<String> tags,
            Boolean fromExternal) {}
}
