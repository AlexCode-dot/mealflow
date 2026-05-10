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

    public void process(String jobId, Path mediaPath, String languageName, String unitSystem) {
        ExtractionJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null) {
            return;
        }

        Path framesDir = null;
        StoredMedia tempMedia =
                new StoredMedia(mediaPath, job.getSourceType(), job.getContentType(), job.getSizeBytes());

        try {
            List<ExtractedFrame> frames;
            if (job.getSourceType() == ExtractionSourceType.IMAGE) {
                frames = List.of(new ExtractedFrame(mediaPath, imageMediaType(job.getContentType())));
            } else {
                framesDir = mediaIngest.workspaceFor(jobId + "_frames");
                frames = frameExtractor.extract(mediaPath, framesDir);
            }

            RecipeDraft draft = llmExtractor.extract(frames, languageName, unitSystem);
            job.setDraft(draft);

            // For image sources we auto-upload the source image as a thumbnail (the user can
            // change it on the review screen if they want). For video sources we upload nothing
            // here — the client picks a frame on-device after extraction completes and uploads
            // only that one frame via the regular image-upload endpoint.
            if (job.getSourceType() == ExtractionSourceType.IMAGE) {
                ImageKitUploadResult uploaded =
                        thumbnailService.uploadThumbnail(job.getUserId(), jobId, job.getSourceType(), mediaPath);
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
            mediaIngest.cleanup(tempMedia);
            if (framesDir != null) {
                mediaIngest.cleanupDirectory(framesDir);
            }
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
