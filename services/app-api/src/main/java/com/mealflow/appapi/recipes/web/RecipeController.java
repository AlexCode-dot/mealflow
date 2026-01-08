package com.mealflow.appapi.recipes.web;

import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.service.RecipeService;
import com.mealflow.appapi.recipes.web.dto.CreateRecipeRequest;
import com.mealflow.appapi.recipes.web.dto.RecipeListItemResponse;
import com.mealflow.appapi.recipes.web.dto.RecipeResponse;
import com.mealflow.appapi.recipes.web.dto.UpdateRecipeRequest;
import com.mealflow.appapi.recipes.web.mapper.RecipeMapper;
import com.mealflow.appapi.recipes.web.mapper.RecipeMapper.CreateArgs;
import com.mealflow.appapi.recipes.web.mapper.RecipeMapper.PatchArgs;
import com.mealflow.appapi.security.config.CurrentUser;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recipes")
public class RecipeController {

    private final RecipeService recipeService;
    private final CurrentUser currentUser;
    private final RecipeMapper mapper;

    public RecipeController(RecipeService recipeService, CurrentUser currentUser, RecipeMapper mapper) {
        this.recipeService = recipeService;
        this.currentUser = currentUser;
        this.mapper = mapper;
    }

    @GetMapping
    public List<RecipeListItemResponse> list(Authentication auth) {
        String userId = currentUser.userId(auth);
        return recipeService.listForUser(userId).stream()
                .map(mapper::toListItem)
                .toList();
    }

    @GetMapping("/{id}")
    public RecipeResponse get(@PathVariable String id, Authentication auth) {
        String userId = currentUser.userId(auth);
        return mapper.toResponse(recipeService.getForUser(userId, id));
    }

    @PostMapping
    public ResponseEntity<RecipeResponse> create(@Valid @RequestBody CreateRecipeRequest body, Authentication auth) {
        String userId = currentUser.userId(auth);
        CreateArgs args = mapper.toCreateArgs(userId, body);

        Recipe created = recipeService.create(
                args.userId(), args.title(), args.description(), args.ingredients(), args.steps(), args.fromExternal());

        return ResponseEntity.status(HttpStatus.CREATED)
                .location(URI.create("/api/recipes/" + created.getId()))
                .body(mapper.toResponse(created));
    }

    @PatchMapping("/{id}")
    public RecipeResponse patch(
            @PathVariable String id, @Valid @RequestBody UpdateRecipeRequest body, Authentication auth) {
        String userId = currentUser.userId(auth);
        PatchArgs args = mapper.toPatchArgs(userId, id, body);

        Recipe updated = recipeService.patch(
                args.userId(),
                args.recipeId(),
                args.title(),
                args.description(),
                args.ingredients(),
                args.steps(),
                args.fromExternal());

        return mapper.toResponse(updated);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id, Authentication auth) {
        String userId = currentUser.userId(auth);
        recipeService.delete(userId, id);
    }
}
