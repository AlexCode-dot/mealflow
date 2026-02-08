package com.mealflow.appapi.recipes.image;

import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.repository.RecipeRepository;
import java.net.URI;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
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
    private final RecipeImageUploadTicketRepository ticketRepository;
    private final ImageUploadProperties uploadProps;
    private final ImageKitClient imageKitClient;
    private final ImageKitProperties imageKitProperties;
    private final Clock clock;

    public RecipeImageService(
            RecipeRepository recipes,
            RecipeImageQuotaRepository quotaRepository,
            RecipeImageUploadTicketRepository ticketRepository,
            ImageUploadProperties uploadProps,
            ImageKitClient imageKitClient,
            ImageKitProperties imageKitProperties,
            Clock clock) {
        this.recipes = recipes;
        this.quotaRepository = quotaRepository;
        this.ticketRepository = ticketRepository;
        this.uploadProps = uploadProps;
        this.imageKitClient = imageKitClient;
        this.imageKitProperties = imageKitProperties;
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

        ticketRepository.save(
                new RecipeImageUploadTicket(userId, result.url(), result.fileId(), clock.instant(), false));

        incrementDailyQuota(userId);
        return result;
    }

    public ImageKitUploadResult consumeTicket(String userId, String imageFileId) {
        if (imageFileId == null || imageFileId.isBlank()) {
            return null;
        }
        RecipeImageUploadTicket ticket = ticketRepository
                .findFirstByUserIdAndImageFileIdAndConsumedFalseOrderByCreatedAtDesc(userId, imageFileId)
                .orElse(null);
        if (ticket == null) {
            return null;
        }

        int ttlMinutes = uploadProps.getTicketTtlMinutes();
        if (ttlMinutes > 0 && ticket.getCreatedAt().isBefore(clock.instant().minusSeconds(ttlMinutes * 60L))) {
            return null;
        }

        ticket.setConsumed(true);
        ticketRepository.save(ticket);
        return new ImageKitUploadResult(ticket.getImageUrl(), ticket.getImageFileId(), null, null);
    }

    public java.util.List<String> getExternalAllowedHosts() {
        List<String> base = uploadProps.getExternalAllowedHosts();
        String imageKitHost = resolveImageKitHost();
        if (imageKitHost == null) {
            return base;
        }
        if (base == null || base.isEmpty()) {
            return List.of(imageKitHost);
        }
        boolean exists = base.stream().anyMatch(host -> host.equalsIgnoreCase(imageKitHost));
        if (exists) {
            return base;
        }
        List<String> merged = new ArrayList<>(base);
        merged.add(imageKitHost);
        return merged;
    }

    private String resolveImageKitHost() {
        String endpoint = imageKitProperties.getUrlEndpoint();
        if (endpoint == null || endpoint.isBlank()) {
            return null;
        }
        try {
            return URI.create(endpoint).getHost();
        } catch (Exception ex) {
            return null;
        }
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
            throw new ImageUploadValidationException("Image is too large. Max size is 10MB.");
        }

        String contentType =
                Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
        if (uploadProps.getAllowedTypes() != null
                && !uploadProps.getAllowedTypes().isEmpty()
                && !uploadProps.getAllowedTypes().contains(contentType)) {
            throw new ImageUploadValidationException("Unsupported image type. Please use JPG, PNG, WEBP, or HEIC.");
        }

        validateMagicBytes(file);
    }

    private void validateMagicBytes(MultipartFile file) {
        try {
            byte[] head = new byte[12];
            try (var stream = file.getInputStream()) {
                int read = stream.read(head);
                if (read < 12) {
                    throw new ImageUploadValidationException(
                            "Unsupported image type. Please use JPG, PNG, WEBP, or HEIC.");
                }
            }

            if (looksLikeJpeg(head) || looksLikePng(head) || looksLikeWebp(head) || looksLikeHeic(head)) {
                return;
            }
        } catch (ImageUploadValidationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ImageUploadValidationException("Could not read uploaded image.");
        }

        throw new ImageUploadValidationException("Unsupported image type. Please use JPG, PNG, WEBP, or HEIC.");
    }

    private boolean looksLikeJpeg(byte[] bytes) {
        return (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8;
    }

    private boolean looksLikePng(byte[] bytes) {
        return (bytes[0] & 0xFF) == 0x89
                && (bytes[1] & 0xFF) == 0x50
                && (bytes[2] & 0xFF) == 0x4E
                && (bytes[3] & 0xFF) == 0x47
                && (bytes[4] & 0xFF) == 0x0D
                && (bytes[5] & 0xFF) == 0x0A
                && (bytes[6] & 0xFF) == 0x1A
                && (bytes[7] & 0xFF) == 0x0A;
    }

    private boolean looksLikeWebp(byte[] bytes) {
        return bytes[0] == 'R'
                && bytes[1] == 'I'
                && bytes[2] == 'F'
                && bytes[3] == 'F'
                && bytes[8] == 'W'
                && bytes[9] == 'E'
                && bytes[10] == 'B'
                && bytes[11] == 'P';
    }

    private boolean looksLikeHeic(byte[] bytes) {
        if (bytes.length < 12) {
            return false;
        }
        boolean ftyp = bytes[4] == 'f' && bytes[5] == 't' && bytes[6] == 'y' && bytes[7] == 'p';
        if (!ftyp) {
            return false;
        }
        String brand = new String(bytes, 8, 4);
        return brand.startsWith("heic")
                || brand.startsWith("heif")
                || brand.startsWith("mif1")
                || brand.startsWith("msf1");
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
