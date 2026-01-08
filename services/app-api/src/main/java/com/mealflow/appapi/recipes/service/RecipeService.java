package com.mealflow.appapi.recipes.service;

import com.mealflow.appapi.recipes.domain.Ingredient;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.repository.RecipeRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final Clock clock;

    public RecipeService(RecipeRepository recipeRepository, Clock clock) {
        this.recipeRepository = recipeRepository;
        this.clock = clock;
    }

    public List<Recipe> listForUser(String userId) {
        return recipeRepository.findAllByUserId(userId);
    }

    public Recipe getForUser(String userId, String recipeId) {
        return recipeRepository
                .findByIdAndUserId(recipeId, userId)
                .orElseThrow(() -> new RecipeNotFoundException("Recipe not found"));
    }

    public Recipe create(
            String userId,
            String title,
            String description,
            List<Ingredient> ingredients,
            List<String> steps,
            boolean fromExternal) {

        Instant now = clock.instant();

        Recipe recipe = new Recipe(userId, title, description, ingredients, steps, fromExternal, now, now);

        return recipeRepository.save(recipe);
    }

    public Recipe patch(
            String userId,
            String recipeId,
            String title,
            String description,
            List<Ingredient> ingredients,
            List<String> steps,
            Boolean fromExternal) {

        // Domain rule for PATCH: if title is provided, it must not be blank after trimming.
        // (DTO @Size allows "   ", so we guard here.)
        if (title != null && title.isBlank()) {
            throw new RecipeValidationException("title must not be blank");
        }

        Recipe existing = getForUser(userId, recipeId);
        existing.applyPatch(title, description, ingredients, steps, fromExternal, clock.instant());
        return recipeRepository.save(existing);
    }

    public void delete(String userId, String recipeId) {
        long deleted = recipeRepository.deleteByIdAndUserId(recipeId, userId);
        if (deleted == 0) {
            throw new RecipeNotFoundException("Recipe not found");
        }
    }
}
