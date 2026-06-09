package com.mealflow.appapi.recipes.extraction.web;

import com.mealflow.appapi.recipes.extraction.domain.ExtractionJob;
import com.mealflow.appapi.recipes.extraction.domain.RecipeDraft;
import com.mealflow.appapi.recipes.extraction.service.RecipeExtractionService;
import com.mealflow.appapi.recipes.extraction.web.dto.AcceptExtractionRequest;
import com.mealflow.appapi.recipes.extraction.web.dto.ExtractionDraftResponse;
import com.mealflow.appapi.recipes.extraction.web.dto.ExtractionJobResponse;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ExtractionMapper {

    public ExtractionJobResponse toResponse(ExtractionJob job) {
        ExtractionDraftResponse draft = job.getDraft() == null ? null : toDraftResponse(job.getDraft());
        return new ExtractionJobResponse(
                job.getId(),
                job.getStatus().name(),
                job.getSourceType() == null ? null : job.getSourceType().name(),
                job.getLocale(),
                draft,
                job.getThumbnailUrl(),
                job.getThumbnailFileId(),
                job.getAcceptedRecipeId(),
                job.getErrorCode(),
                job.getErrorMessage(),
                job.getCreatedAt(),
                job.getUpdatedAt());
    }

    private ExtractionDraftResponse toDraftResponse(RecipeDraft draft) {
        List<ExtractionDraftResponse.DraftIngredientDto> ingredients = draft.getIngredients().stream()
                .map(i -> new ExtractionDraftResponse.DraftIngredientDto(
                        i.getName(), i.getQuantity(), i.getUnit(), i.isEstimated()))
                .toList();
        return new ExtractionDraftResponse(
                draft.getTitle(),
                draft.getDescription(),
                ingredients,
                draft.getSteps(),
                draft.getCookingTimeMinutes(),
                draft.getPortions(),
                draft.getCategory(),
                draft.getLanguage(),
                draft.getUncertainFields());
    }

    public RecipeExtractionService.AcceptRequest toAcceptArgs(AcceptExtractionRequest body) {
        List<RecipeExtractionService.AcceptIngredient> ingredients = body.ingredients() == null
                ? List.of()
                : body.ingredients().stream()
                        .map(i -> new RecipeExtractionService.AcceptIngredient(
                                i.name() == null ? null : i.name().trim(), i.quantity(), trim(i.unit())))
                        .toList();
        List<String> steps = body.steps() == null ? List.of() : body.steps();
        return new RecipeExtractionService.AcceptRequest(
                body.title() == null ? null : body.title().trim(),
                body.description(),
                trim(body.imageUrl()),
                trim(body.imageFileId()),
                ingredients,
                steps,
                body.cookingTimeMinutes(),
                body.portions(),
                trim(body.category()));
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }
}
