package com.mealflow.appapi.recipes.web.mapper;

import com.mealflow.appapi.recipes.domain.Ingredient;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.web.dto.CreateRecipeRequest;
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

        return new CreateArgs(userId, body.title().trim(), body.description(), ingredients, steps, fromExternal);
    }

    public PatchArgs toPatchArgs(String userId, String recipeId, UpdateRecipeRequest body) {
        List<Ingredient> ingredients = body.ingredients() == null
                ? null
                : body.ingredients().stream().map(this::toDomain).toList();

        return new PatchArgs(
                userId, recipeId, body.title(), body.description(), ingredients, body.steps(), body.fromExternal());
    }

    public RecipeResponse toResponse(Recipe r) {
        return new RecipeResponse(
                r.getId(),
                r.getTitle(),
                r.getDescription(),
                r.getIngredients().stream().map(this::toDto).toList(),
                r.getSteps(),
                r.isFromExternal(),
                r.getCreatedAt(),
                r.getUpdatedAt());
    }

    public RecipeListItemResponse toListItem(Recipe r) {
        return new RecipeListItemResponse(r.getId(), r.getTitle(), r.getDescription(), r.isFromExternal());
    }

    private Ingredient toDomain(IngredientDto dto) {
        String name = dto.name().trim();
        String unit = dto.unit() == null ? null : dto.unit().trim();
        return new Ingredient(name, dto.quantity(), unit);
    }

    private IngredientDto toDto(Ingredient ing) {
        return new IngredientDto(ing.getName(), ing.getQuantity(), ing.getUnit());
    }

    public record CreateArgs(
            String userId,
            String title,
            String description,
            List<Ingredient> ingredients,
            List<String> steps,
            boolean fromExternal) {}

    public record PatchArgs(
            String userId,
            String recipeId,
            String title,
            String description,
            List<Ingredient> ingredients,
            List<String> steps,
            Boolean fromExternal) {}
}
