package com.mealflow.appapi.recipes.extraction.service;

import java.nio.file.Path;

public record ExtractedFrame(Path path, String mediaType) {}
