package com.mealflow.appapi.recipes.image;

import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.repository.RecipeRepository;
import java.nio.file.Paths;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class RecipeImageService {

    private static final Logger log = LoggerFactory.getLogger(RecipeImageService.class);

    private final RecipeRepository recipes;
    private final RecipeImageQuotaRepository quotaRepository;
    private final ImageUploadProperties uploadProps;
    private final ImageKitClient imageKitClient;
    private final Clock clock;

    public RecipeImageService(
            RecipeRepository recipes,
            RecipeImageQuotaRepository quotaRepository,
            ImageUploadProperties uploadProps,
            ImageKitClient imageKitClient,
            Clock clock) {
        this.recipes = recipes;
        this.quotaRepository = quotaRepository;
        this.uploadProps = uploadProps;
        this.imageKitClient = imageKitClient;
        this.clock = clock;
    }

    public ImageKitUploadResult upload(String userId, MultipartFile file, String recipeId) {
        validateFile(file);

        boolean replacesExisting = hasExistingImage(userId, recipeId);

        if (!replacesExisting && uploadProps.getMaxPerUser() > 0) {
            long current = recipes.countByUserIdAndImageUrlNotNull(userId);
            if (current >= uploadProps.getMaxPerUser()) {
                throw new ImageUploadValidationException(
                        "You have reached the maximum number of recipe photos. Remove one to add another.");
            }
        }

        enforceDailyQuota(userId);

        String fileName = buildFilename(userId, file);
        ImageKitUploadResult result = imageKitClient.upload(file, fileName, userId);

        incrementDailyQuota(userId);
        return result;
    }

    public void deleteByFileId(String fileId) {
        if (fileId == null || fileId.isBlank()) {
            return;
        }
        try {
            imageKitClient.delete(fileId);
        } catch (Exception ex) {
            log.warn("Failed to delete image fileId {}", fileId, ex);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ImageUploadValidationException("Please choose an image to upload.");
        }

        long maxBytes = uploadProps.getMaxUploadBytes();
        if (maxBytes > 0 && file.getSize() > maxBytes) {
            throw new ImageUploadValidationException("Image is too large. Max size is 5MB.");
        }

        String contentType =
                Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
        if (uploadProps.getAllowedTypes() != null
                && !uploadProps.getAllowedTypes().isEmpty()
                && !uploadProps.getAllowedTypes().contains(contentType)) {
            throw new ImageUploadValidationException("Unsupported image type. Please use JPG, PNG, or WEBP.");
        }
    }

    private boolean hasExistingImage(String userId, String recipeId) {
        if (recipeId == null || recipeId.isBlank()) {
            return false;
        }

        Recipe recipe = recipes.findByIdAndUserId(recipeId, userId)
                .orElseThrow(() -> new ImageUploadValidationException("Recipe not found."));
        return recipe.getImageUrl() != null && !recipe.getImageUrl().isBlank();
    }

    private void enforceDailyQuota(String userId) {
        int maxPerDay = uploadProps.getMaxPerDay();
        if (maxPerDay <= 0) {
            return;
        }

        LocalDate today = LocalDate.now(clock);
        RecipeImageQuota quota = quotaRepository
                .findByUserIdAndDate(userId, today)
                .orElseGet(() -> new RecipeImageQuota(userId, today, 0));

        if (quota.getCount() >= maxPerDay) {
            throw new ImageUploadValidationException("Daily upload limit reached. Try again tomorrow.");
        }
    }

    private void incrementDailyQuota(String userId) {
        int maxPerDay = uploadProps.getMaxPerDay();
        if (maxPerDay <= 0) {
            return;
        }

        LocalDate today = LocalDate.now(clock);
        RecipeImageQuota quota = quotaRepository
                .findByUserIdAndDate(userId, today)
                .orElseGet(() -> new RecipeImageQuota(userId, today, 0));
        quota.setCount(quota.getCount() + 1);
        quotaRepository.save(quota);
    }

    private String buildFilename(String userId, MultipartFile file) {
        String extension = extensionFor(file.getContentType());
        String original = file.getOriginalFilename();
        if (original != null && !original.isBlank()) {
            String base = Paths.get(original).getFileName().toString();
            int dot = base.lastIndexOf('.');
            if (dot > 0 && dot < base.length() - 1) {
                extension = base.substring(dot);
            }
        }

        long timestamp = clock.instant().toEpochMilli();
        return "recipe-" + userId + "-" + timestamp + extension;
    }

    private String extensionFor(String contentType) {
        if (contentType == null) {
            return ".jpg";
        }
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/heic", "image/heif" -> ".heic";
            default -> ".jpg";
        };
    }
}
