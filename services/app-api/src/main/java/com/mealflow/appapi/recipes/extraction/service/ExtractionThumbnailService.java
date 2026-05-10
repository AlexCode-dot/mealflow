package com.mealflow.appapi.recipes.extraction.service;

import com.mealflow.appapi.recipes.extraction.domain.ExtractionSourceType;
import com.mealflow.appapi.recipes.image.ImageKitClient;
import com.mealflow.appapi.recipes.image.ImageKitProperties;
import com.mealflow.appapi.recipes.image.ImageKitUploadResult;
import com.mealflow.appapi.recipes.image.RecipeImageUploadTicket;
import com.mealflow.appapi.recipes.image.RecipeImageUploadTicketRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Uploads the source image as a thumbnail to ImageKit during extraction (image-source only)
 * and creates an upload ticket so the user can consume it when accepting the draft.
 *
 * <p>Video-source extractions do NOT pre-upload thumbnails — the user picks a frame on the
 * device and uploads only that one frame via the regular image upload endpoint.
 */
@Service
public class ExtractionThumbnailService {

    private static final Logger log = LoggerFactory.getLogger(ExtractionThumbnailService.class);

    private final ImageKitClient imageKitClient;
    private final ImageKitProperties imageKitProperties;
    private final RecipeImageUploadTicketRepository ticketRepository;
    private final Clock clock;

    public ExtractionThumbnailService(
            ImageKitClient imageKitClient,
            ImageKitProperties imageKitProperties,
            RecipeImageUploadTicketRepository ticketRepository,
            Clock clock) {
        this.imageKitClient = imageKitClient;
        this.imageKitProperties = imageKitProperties;
        this.ticketRepository = ticketRepository;
        this.clock = clock;
    }

    public boolean isEnabled() {
        String key = imageKitProperties.getPrivateKey();
        String endpoint = imageKitProperties.getUrlEndpoint();
        return key != null && !key.isBlank() && endpoint != null && !endpoint.isBlank();
    }

    /**
     * Upload a single thumbnail for the given extraction job. Returns null silently if ImageKit
     * isn't configured or any error occurs — a missing thumbnail must never fail extraction.
     */
    public ImageKitUploadResult uploadThumbnail(
            String userId, String jobId, ExtractionSourceType sourceType, Path imagePath) {
        if (!isEnabled() || imagePath == null) {
            return null;
        }
        try {
            byte[] data = Files.readAllBytes(imagePath);
            String contentType = sourceType == ExtractionSourceType.VIDEO ? "image/jpeg" : guessContentType(imagePath);
            String fileName = "extraction-" + userId + "-" + jobId + suffixFor(contentType);
            ImageKitUploadResult result = imageKitClient.uploadBytes(data, fileName, contentType, userId);
            ticketRepository.save(
                    new RecipeImageUploadTicket(userId, result.url(), result.fileId(), clock.instant(), false));
            return result;
        } catch (IOException ex) {
            log.warn("Could not read thumbnail file for job {}: {}", jobId, ex.getMessage());
            return null;
        } catch (RuntimeException ex) {
            log.warn("Thumbnail upload failed for job {}: {}", jobId, ex.getMessage());
            return null;
        }
    }

    /**
     * Delete a thumbnail from ImageKit and remove its (unconsumed) ticket. Best effort — failures
     * are logged but never thrown.
     */
    public void deleteThumbnail(String userId, String fileId) {
        if (fileId == null || fileId.isBlank()) {
            return;
        }
        try {
            imageKitClient.delete(fileId);
        } catch (RuntimeException ex) {
            log.warn("Failed to delete ImageKit file {}: {}", fileId, ex.getMessage());
        }
        try {
            ticketRepository
                    .findFirstByUserIdAndImageFileIdAndConsumedFalseOrderByCreatedAtDesc(userId, fileId)
                    .ifPresent(ticketRepository::delete);
        } catch (RuntimeException ex) {
            log.warn("Failed to delete upload ticket for {}: {}", fileId, ex.getMessage());
        }
    }

    private String guessContentType(Path path) {
        String name = path.getFileName().toString().toLowerCase();
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".webp")) return "image/webp";
        if (name.endsWith(".heic") || name.endsWith(".heif")) return "image/heic";
        return "image/jpeg";
    }

    private String suffixFor(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/heic", "image/heif" -> ".heic";
            default -> ".jpg";
        };
    }
}
