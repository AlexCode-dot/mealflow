package com.mealflow.appapi.recipes.extraction.service;

import com.mealflow.appapi.recipes.extraction.domain.ExtractionJob;
import com.mealflow.appapi.recipes.extraction.domain.ExtractionSourceType;
import com.mealflow.appapi.recipes.extraction.domain.ExtractionStatus;
import com.mealflow.appapi.recipes.extraction.domain.RecipeDraft;
import com.mealflow.appapi.recipes.extraction.repository.ExtractionJobRepository;
import com.mealflow.appapi.recipes.image.ImageKitUploadResult;
import java.nio.file.Path;
import java.time.Clock;
import java.util.List;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class ExtractionJobProcessor {

    private static final Logger log = LoggerFactory.getLogger(ExtractionJobProcessor.class);

    private final ExtractionJobRepository jobRepository;
    private final MediaIngestService mediaIngest;
    private final VideoFrameExtractor frameExtractor;
    private final LlmRecipeExtractor llmExtractor;
    private final ExtractionThumbnailService thumbnailService;
    private final Clock clock;

    public ExtractionJobProcessor(
            ExtractionJobRepository jobRepository,
            MediaIngestService mediaIngest,
            VideoFrameExtractor frameExtractor,
            LlmRecipeExtractor llmExtractor,
            ExtractionThumbnailService thumbnailService,
            Clock clock) {
        this.jobRepository = jobRepository;
        this.mediaIngest = mediaIngest;
        this.frameExtractor = frameExtractor;
        this.llmExtractor = llmExtractor;
        this.thumbnailService = thumbnailService;
        this.clock = clock;
    }

    public void process(String jobId, List<StoredMedia> media, String languageName, String unitSystem) {
        ExtractionJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null) {
            media.forEach(mediaIngest::cleanup);
            return;
        }

        Path framesDir = null;
        StoredMedia primary = media.get(0);

        try {
            List<ExtractedFrame> frames;
            if (job.getSourceType() == ExtractionSourceType.IMAGE) {
                // One frame per uploaded image — a recipe can span several photos, and the LLM
                // reads them together (in upload order) in a single request.
                frames = media.stream()
                        .map(m -> new ExtractedFrame(m.path(), imageMediaType(m.contentType())))
                        .toList();
            } else {
                framesDir = mediaIngest.workspaceFor(jobId + "_frames");
                frames = frameExtractor.extract(primary.path(), framesDir);
            }

            RecipeDraft draft = llmExtractor.extract(frames, languageName, unitSystem);
            job.setDraft(draft);

            // For image sources we auto-upload the first image as a thumbnail (the user can
            // change it on the review screen if they want). For video sources we upload nothing
            // here — the client picks a frame on-device after extraction completes and uploads
            // only that one frame via the regular image-upload endpoint.
            if (job.getSourceType() == ExtractionSourceType.IMAGE) {
                ImageKitUploadResult uploaded =
                        thumbnailService.uploadThumbnail(job.getUserId(), jobId, job.getSourceType(), primary.path());
                if (uploaded != null) {
                    job.setThumbnailUrl(uploaded.url());
                    job.setThumbnailFileId(uploaded.fileId());
                }
            }

            job.setStatus(ExtractionStatus.READY);
            job.setUpdatedAt(clock.instant());
            jobRepository.save(job);
        } catch (ExtractionValidationException ex) {
            job.setStatus(ExtractionStatus.FAILED);
            job.setErrorCode("VALIDATION");
            job.setErrorMessage(ex.getMessage());
            job.setUpdatedAt(clock.instant());
            jobRepository.save(job);
        } catch (RuntimeException ex) {
            log.warn("Extraction job {} failed: {}", jobId, ex.getMessage(), ex);
            job.setStatus(ExtractionStatus.FAILED);
            job.setErrorCode("INTERNAL");
            job.setErrorMessage("Extraction failed. Please try again.");
            job.setUpdatedAt(clock.instant());
            jobRepository.save(job);
        } finally {
            media.forEach(mediaIngest::cleanup);
            if (framesDir != null) {
                mediaIngest.cleanupDirectory(framesDir);
            }
        }
    }

    public void processText(String jobId, String transcript, String languageName, String unitSystem) {
        runDraftJob(jobId, () -> llmExtractor.extractFromText(transcript, languageName, unitSystem));
    }

    public void processSearch(String jobId, String dishName, String languageName, String unitSystem) {
        runDraftJob(jobId, () -> llmExtractor.searchByName(dishName, languageName, unitSystem));
    }

    /**
     * Shared job handling for the media-less sources (spoken and searched recipes): build the draft,
     * mark the job ready, and record a failure the review screen can show. There is no source image
     * for these — the user can add a photo on the review screen.
     */
    private void runDraftJob(String jobId, Supplier<RecipeDraft> draftSupplier) {
        ExtractionJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null) {
            return;
        }
        try {
            job.setDraft(draftSupplier.get());
            job.setStatus(ExtractionStatus.READY);
            job.setUpdatedAt(clock.instant());
            jobRepository.save(job);
        } catch (ExtractionValidationException ex) {
            job.setStatus(ExtractionStatus.FAILED);
            job.setErrorCode("VALIDATION");
            job.setErrorMessage(ex.getMessage());
            job.setUpdatedAt(clock.instant());
            jobRepository.save(job);
        } catch (RuntimeException ex) {
            log.warn("Extraction job {} failed: {}", jobId, ex.getMessage(), ex);
            job.setStatus(ExtractionStatus.FAILED);
            job.setErrorCode("INTERNAL");
            job.setErrorMessage("Extraction failed. Please try again.");
            job.setUpdatedAt(clock.instant());
            jobRepository.save(job);
        }
    }

    private String imageMediaType(String contentType) {
        if (contentType == null) {
            return "image/jpeg";
        }
        return switch (contentType) {
            case "image/png" -> "image/png";
            case "image/webp" -> "image/webp";
            default -> "image/jpeg";
        };
    }
}
