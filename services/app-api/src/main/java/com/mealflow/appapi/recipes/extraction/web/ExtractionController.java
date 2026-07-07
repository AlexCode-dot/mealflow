package com.mealflow.appapi.recipes.extraction.web;

import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.extraction.domain.ExtractionJob;
import com.mealflow.appapi.recipes.extraction.service.RecipeExtractionService;
import com.mealflow.appapi.recipes.extraction.web.dto.AcceptExtractionRequest;
import com.mealflow.appapi.recipes.extraction.web.dto.ExtractTextRequest;
import com.mealflow.appapi.recipes.extraction.web.dto.ExtractionJobResponse;
import com.mealflow.appapi.recipes.web.dto.RecipeResponse;
import com.mealflow.appapi.recipes.web.mapper.RecipeMapper;
import com.mealflow.appapi.security.config.CurrentUser;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/recipes/extract")
public class ExtractionController {

    private final RecipeExtractionService service;
    private final ExtractionMapper extractionMapper;
    private final RecipeMapper recipeMapper;
    private final CurrentUser currentUser;

    public ExtractionController(
            RecipeExtractionService service,
            ExtractionMapper extractionMapper,
            RecipeMapper recipeMapper,
            CurrentUser currentUser) {
        this.service = service;
        this.extractionMapper = extractionMapper;
        this.recipeMapper = recipeMapper;
        this.currentUser = currentUser;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExtractionJobResponse> create(
            @RequestPart("file") List<MultipartFile> files,
            @RequestParam(value = "locale", required = false) String locale,
            Authentication auth) {
        String userId = currentUser.userId(auth);
        ExtractionJob job = service.enqueue(userId, files, locale);
        ExtractionJobResponse response = extractionMapper.toResponse(job);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .location(URI.create("/api/recipes/extract/" + job.getId()))
                .body(response);
    }

    @PostMapping("/text")
    public ResponseEntity<ExtractionJobResponse> createFromText(
            @Valid @RequestBody ExtractTextRequest body, Authentication auth) {
        String userId = currentUser.userId(auth);
        ExtractionJob job = service.enqueueText(userId, body.transcript(), body.locale());
        ExtractionJobResponse response = extractionMapper.toResponse(job);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .location(URI.create("/api/recipes/extract/" + job.getId()))
                .body(response);
    }

    @GetMapping("/{jobId}")
    public ExtractionJobResponse get(@PathVariable String jobId, Authentication auth) {
        String userId = currentUser.userId(auth);
        return extractionMapper.toResponse(service.getJob(userId, jobId));
    }

    @PostMapping("/{jobId}/accept")
    public ResponseEntity<RecipeResponse> accept(
            @PathVariable String jobId, @Valid @RequestBody AcceptExtractionRequest body, Authentication auth) {
        String userId = currentUser.userId(auth);
        Recipe created = service.accept(userId, jobId, extractionMapper.toAcceptArgs(body));
        return ResponseEntity.status(HttpStatus.CREATED)
                .location(URI.create("/api/recipes/" + created.getId()))
                .body(recipeMapper.toResponse(created));
    }
}
