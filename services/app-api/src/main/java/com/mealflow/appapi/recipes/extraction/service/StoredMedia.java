package com.mealflow.appapi.recipes.extraction.service;

import com.mealflow.appapi.recipes.extraction.domain.ExtractionSourceType;
import java.nio.file.Path;

public record StoredMedia(Path path, ExtractionSourceType sourceType, String contentType, long sizeBytes) {}
