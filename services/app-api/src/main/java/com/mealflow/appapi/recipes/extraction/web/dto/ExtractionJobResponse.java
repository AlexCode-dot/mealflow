package com.mealflow.appapi.recipes.extraction.web.dto;

import java.time.Instant;

public record ExtractionJobResponse(
        String jobId,
        String status,
        String sourceType,
        String locale,
        ExtractionDraftResponse draft,
        String thumbnailUrl,
        String thumbnailFileId,
        String acceptedRecipeId,
        String errorCode,
        String errorMessage,
        Instant createdAt,
        Instant updatedAt) {}
