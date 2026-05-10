package com.mealflow.appapi.recipes.extraction.service;

import com.mealflow.appapi.recipes.domain.Ingredient;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.extraction.config.ExtractionAsyncConfig;
import com.mealflow.appapi.recipes.extraction.domain.ExtractionJob;
import com.mealflow.appapi.recipes.extraction.domain.ExtractionSourceType;
import com.mealflow.appapi.recipes.extraction.domain.ExtractionStatus;
import com.mealflow.appapi.recipes.extraction.repository.ExtractionJobRepository;
import com.mealflow.appapi.recipes.service.RecipeService;
import java.nio.file.Path;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class RecipeExtractionService {

    private final ExtractionJobRepository jobRepository;
    private final MediaIngestService mediaIngest;
    private final ExtractionLocaleResolver localeResolver;
    private final ExtractionQuotaService quotaService;
    private final ExtractionJobProcessor jobProcessor;
    private final RecipeService recipeService;
    private final ExtractionThumbnailService thumbnailService;
    private final TaskExecutor extractionExecutor;
    private final Clock clock;

    public RecipeExtractionService(
            ExtractionJobRepository jobRepository,
            MediaIngestService mediaIngest,
            ExtractionLocaleResolver localeResolver,
            ExtractionQuotaService quotaService,
            ExtractionJobProcessor jobProcessor,
            RecipeService recipeService,
            ExtractionThumbnailService thumbnailService,
            @Qualifier(ExtractionAsyncConfig.EXECUTOR_BEAN) TaskExecutor extractionExecutor,
            Clock clock) {
        this.jobRepository = jobRepository;
        this.mediaIngest = mediaIngest;
        this.localeResolver = localeResolver;
        this.quotaService = quotaService;
        this.jobProcessor = jobProcessor;
        this.recipeService = recipeService;
        this.thumbnailService = thumbnailService;
        this.extractionExecutor = extractionExecutor;
        this.clock = clock;
    }

    public ExtractionJob enqueue(String userId, MultipartFile file, String locale) {
        quotaService.enforce(userId);

        ExtractionLocaleResolver.Resolved resolved = localeResolver.resolve(locale);

        ExtractionJob job = new ExtractionJob(
                userId,
                ExtractionSourceType.IMAGE,
                ExtractionStatus.PENDING,
                null,
                0L,
                resolved.languageCode(),
                resolved.unitSystem(),
                clock.instant());
        job = jobRepository.save(job);

        StoredMedia stored;
        try {
            stored = mediaIngest.store(file, job.getId());
        } catch (RuntimeException ex) {
            jobRepository.deleteById(job.getId());
            throw ex;
        }

        job.setSourceType(stored.sourceType());
        job.setContentType(stored.contentType());
        job.setSizeBytes(stored.sizeBytes());
        job.setStatus(ExtractionStatus.PROCESSING);
        job.setUpdatedAt(clock.instant());
        jobRepository.save(job);

        String jobId = job.getId();
        Path mediaPath = stored.path();
        String languageName = resolved.languageName();
        String unitSystem = resolved.unitSystem();
        extractionExecutor.execute(() -> jobProcessor.process(jobId, mediaPath, languageName, unitSystem));
        return job;
    }

    public ExtractionJob getJob(String userId, String jobId) {
        return jobRepository
                .findByIdAndUserId(jobId, userId)
                .orElseThrow(() -> new ExtractionNotFoundException("Extraction not found"));
    }

    public Recipe accept(String userId, String jobId, AcceptRequest request) {
        ExtractionJob job = getJob(userId, jobId);
        if (job.getStatus() != ExtractionStatus.READY) {
            throw new ExtractionStateException("Extraction is not ready to be accepted.");
        }
        if (job.getAcceptedRecipeId() != null) {
            throw new ExtractionStateException("Extraction has already been accepted.");
        }

        List<Ingredient> ingredients = new ArrayList<>();
        if (request.ingredients() != null) {
            for (AcceptIngredient ing : request.ingredients()) {
                ingredients.add(new Ingredient(ing.name(), ing.quantity(), ing.unit()));
            }
        }
        List<String> steps = request.steps() == null ? List.of() : new ArrayList<>(request.steps());

        Recipe created = recipeService.create(
                userId,
                request.title(),
                request.description(),
                request.imageUrl(),
                request.imageFileId(),
                ingredients,
                steps,
                request.cookingTimeMinutes(),
                request.portions(),
                request.category(),
                true,
                job.getLocale());

        job.setStatus(ExtractionStatus.ACCEPTED);
        job.setAcceptedRecipeId(created.getId());
        job.setUpdatedAt(clock.instant());
        jobRepository.save(job);

        // If the user picked a different image (e.g. picked a different frame from the video,
        // or a custom photo from their library), the auto-uploaded source thumbnail is no longer
        // referenced by anything. Delete it so it doesn't sit in ImageKit forever.
        String autoThumbId = job.getThumbnailFileId();
        String keepFileId = request.imageFileId();
        if (autoThumbId != null && !autoThumbId.isBlank() && !autoThumbId.equals(keepFileId)) {
            thumbnailService.deleteThumbnail(userId, autoThumbId);
        }

        return created;
    }

    public record AcceptRequest(
            String title,
            String description,
            String imageUrl,
            String imageFileId,
            List<AcceptIngredient> ingredients,
            List<String> steps,
            Integer cookingTimeMinutes,
            Integer portions,
            String category) {}

    public record AcceptIngredient(String name, Double quantity, String unit) {}
}
