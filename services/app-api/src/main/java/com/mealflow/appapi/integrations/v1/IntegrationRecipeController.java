package com.mealflow.appapi.integrations.v1;

import com.mealflow.appapi.integrations.v1.dto.CreateRecipeBody;
import com.mealflow.appapi.integrations.v1.dto.RecipeDto;
import com.mealflow.appapi.integrations.v1.dto.RecipePageDto;
import com.mealflow.appapi.integrations.v1.dto.UpdateRecipeBody;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.security.oauth.IntegrationTokenClaims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/integrations/v1/recipes")
public class IntegrationRecipeController {

    private final IntegrationRecipeService recipes;
    private final IdempotencyService idempotency;

    public IntegrationRecipeController(IntegrationRecipeService recipes, IdempotencyService idempotency) {
        this.recipes = recipes;
        this.idempotency = idempotency;
    }

    @GetMapping
    public RecipePageDto list(
            Authentication auth,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "limit", required = false) Integer limit,
            @RequestParam(name = "cursor", required = false) String cursor) {
        return recipes.list(IntegrationTokenClaims.from(auth).userId(), q, limit, cursor);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RecipeDto> get(@PathVariable String id, Authentication auth) {
        return ok(HttpStatus.OK, recipes.get(IntegrationTokenClaims.from(auth).userId(), id));
    }

    @PostMapping
    public ResponseEntity<Object> create(
            @Valid @RequestBody CreateRecipeBody body,
            @RequestHeader(name = IdempotencyService.HEADER, required = false) String idempotencyKey,
            Authentication auth,
            HttpServletRequest request) {
        IntegrationTokenClaims token = IntegrationTokenClaims.from(auth);
        return idempotency.execute(token, idempotencyKey, request, body, () -> {
            Recipe created = recipes.create(token.userId(), body);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .location(URI.create("/integrations/v1/recipes/" + created.getId()))
                    .eTag(Versioning.etag(created.getUpdatedAt()))
                    .body(IntegrationRecipeService.toDto(created));
        });
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Object> update(
            @PathVariable String id,
            @Valid @RequestBody UpdateRecipeBody body,
            @RequestHeader(name = IdempotencyService.HEADER, required = false) String idempotencyKey,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            Authentication auth,
            HttpServletRequest request) {
        IntegrationTokenClaims token = IntegrationTokenClaims.from(auth);
        return idempotency.execute(
                token,
                idempotencyKey,
                request,
                body,
                () -> ok(HttpStatus.OK, recipes.update(token.userId(), id, body, ifMatch)));
    }

    private static ResponseEntity<RecipeDto> ok(HttpStatus status, Recipe recipe) {
        return ResponseEntity.status(status)
                .eTag(Versioning.etag(recipe.getUpdatedAt()))
                .body(IntegrationRecipeService.toDto(recipe));
    }
}
