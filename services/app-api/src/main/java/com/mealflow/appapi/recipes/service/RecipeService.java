package com.mealflow.appapi.recipes.service;

import com.mealflow.appapi.recipes.domain.ImageAttribution;
import com.mealflow.appapi.recipes.domain.Ingredient;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.image.RecipeImageService;
import com.mealflow.appapi.recipes.repository.RecipeRepository;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class RecipeService {
    private static final int DEFAULT_PAGE_LIMIT = 24;
    private static final int MAX_PAGE_LIMIT = 100;
    private static final int MAX_TAG_LENGTH = 40;
    private static final int MAX_TAGS_PER_RECIPE = 10;

    private final RecipeRepository recipeRepository;
    private final RecipeImageService imageService;
    private final Clock clock;

    public RecipeService(RecipeRepository recipeRepository, RecipeImageService imageService, Clock clock) {
        this.recipeRepository = recipeRepository;
        this.imageService = imageService;
        this.clock = clock;
    }

    public List<Recipe> listForUser(String userId) {
        return recipeRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Recipe> listForUser(String userId, Integer limit, Integer offset) {
        if (limit == null && offset == null) {
            return listForUser(userId);
        }
        int safeLimit = sanitizeLimit(limit);
        int safeOffset = sanitizeOffset(offset);
        Pageable pageable = PageRequest.of(safeOffset / safeLimit, safeLimit);
        return recipeRepository.findAllByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public Recipe getForUser(String userId, String recipeId) {
        return recipeRepository
                .findByIdAndUserId(recipeId, userId)
                .orElseThrow(() -> new RecipeNotFoundException("Recipe not found"));
    }

    private int sanitizeLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_PAGE_LIMIT;
        }
        return Math.min(limit, MAX_PAGE_LIMIT);
    }

    private int sanitizeOffset(Integer offset) {
        if (offset == null || offset < 0) {
            return 0;
        }
        return offset;
    }

    public Recipe create(
            String userId,
            String title,
            String description,
            String imageUrl,
            String imageFileId,
            ImageAttribution imageAttribution,
            List<Ingredient> ingredients,
            List<String> steps,
            Integer cookingTimeMinutes,
            Integer portions,
            String category,
            List<String> tags,
            boolean fromExternal,
            String language) {

        Instant now = clock.instant();
        ImageResolution image = resolveImageForCreate(userId, imageUrl, imageFileId, fromExternal);

        Recipe recipe = new Recipe(
                userId,
                title,
                description,
                image.imageUrl(),
                image.imageFileId(),
                ingredients,
                steps,
                cookingTimeMinutes,
                portions,
                category,
                fromExternal,
                language,
                now,
                now);
        recipe.setTags(normalizeTags(tags));
        // Attribution only makes sense for an externally hosted stock photo — a client that sends
        // it alongside its own upload (or no image at all) is out of sync, so drop it.
        if (image.imageFileId() == null && image.imageUrl() != null) {
            recipe.setImageAttribution(imageAttribution);
        }

        return recipeRepository.save(recipe);
    }

    public Recipe patch(
            String userId,
            String recipeId,
            String title,
            String description,
            String imageUrl,
            String imageFileId,
            ImageAttribution imageAttribution,
            List<Ingredient> ingredients,
            List<String> steps,
            Integer cookingTimeMinutes,
            Integer portions,
            String category,
            List<String> tags,
            Boolean fromExternal,
            String language) {

        // Domain rule for PATCH: if title is provided, it must not be blank after trimming.
        // (DTO @Size allows "   ", so we guard here.)
        if (title != null && title.isBlank()) {
            throw new RecipeValidationException("title must not be blank");
        }

        Recipe existing = getForUser(userId, recipeId);
        ImageResolution image = resolveImageForPatch(userId, existing, imageUrl, imageFileId, fromExternal);
        String oldImageFileId = existing.getImageFileId();
        boolean imageProvided = imageUrl != null || imageFileId != null;
        boolean imageReplaced = imageProvided
                && (!Objects.equals(image.imageUrl(), existing.getImageUrl())
                        || !Objects.equals(image.imageFileId(), existing.getImageFileId()));
        existing.applyPatch(
                title,
                description,
                image.imageUrl(),
                image.imageFileId(),
                ingredients,
                steps,
                cookingTimeMinutes,
                portions,
                category,
                tags == null ? null : normalizeTags(tags),
                fromExternal,
                language,
                clock.instant());
        // The credit belongs to the image, so it follows the same replacement rule as the old
        // ImageKit file below: a new image brings its own attribution (or none — a user upload
        // is never credited), while an untouched image keeps what it had unless the client sends
        // an updated credit explicitly.
        if (imageReplaced) {
            existing.setImageAttribution(image.imageFileId() == null ? imageAttribution : null);
        } else if (imageAttribution != null) {
            existing.setImageAttribution(imageAttribution);
        }
        if (imageFileId != null
                && oldImageFileId != null
                && !oldImageFileId.isBlank()
                && !oldImageFileId.equals(imageFileId)) {
            imageService.deleteByFileId(oldImageFileId);
        }
        return recipeRepository.save(existing);
    }

    public void delete(String userId, String recipeId) {
        Recipe recipe = getForUser(userId, recipeId);
        if (recipe.getImageFileId() != null) {
            imageService.deleteByFileId(recipe.getImageFileId());
        }
        long deleted = recipeRepository.deleteByIdAndUserId(recipeId, userId);
        if (deleted == 0) {
            throw new RecipeNotFoundException("Recipe not found");
        }
    }

    public Recipe clearImage(String userId, String recipeId) {
        Recipe recipe = getForUser(userId, recipeId);
        if (recipe.getImageFileId() != null) {
            imageService.deleteByFileId(recipe.getImageFileId());
        }
        recipe.setImageUrl(null);
        recipe.setImageFileId(null);
        recipe.setImageAttribution(null);
        recipe.setUpdatedAt(clock.instant());
        return recipeRepository.save(recipe);
    }

    private ImageResolution resolveImageForCreate(
            String userId, String imageUrl, String imageFileId, boolean fromExternal) {
        if (imageFileId != null) {
            var ticket = imageService.consumeTicket(userId, imageFileId);
            if (ticket == null) {
                throw new RecipeValidationException("Image upload expired or invalid. Please re-upload.");
            }
            return new ImageResolution(ticket.url(), ticket.fileId());
        }

        if (imageUrl != null) {
            if (fromExternal) {
                validateExternalImageUrl(imageUrl);
                return new ImageResolution(imageUrl, null);
            }
            throw new RecipeValidationException("Image must be uploaded before saving.");
        }

        return new ImageResolution(null, null);
    }

    private ImageResolution resolveImageForPatch(
            String userId, Recipe existing, String imageUrl, String imageFileId, Boolean fromExternal) {
        if (imageFileId == null && imageUrl == null) {
            return new ImageResolution(null, null);
        }

        String currentUrl = existing.getImageUrl();
        String currentFileId = existing.getImageFileId();

        if (imageFileId != null) {
            if (imageFileId.equals(currentFileId)) {
                return new ImageResolution(currentUrl, currentFileId);
            }
            var ticket = imageService.consumeTicket(userId, imageFileId);
            if (ticket == null) {
                throw new RecipeValidationException("Image upload expired or invalid. Please re-upload.");
            }
            return new ImageResolution(ticket.url(), ticket.fileId());
        }

        if (imageUrl != null) {
            if (imageUrl.equals(currentUrl)) {
                return new ImageResolution(currentUrl, currentFileId);
            }
            if (Boolean.TRUE.equals(fromExternal)) {
                validateExternalImageUrl(imageUrl);
                return new ImageResolution(imageUrl, null);
            }
            throw new RecipeValidationException("Image must be uploaded before saving.");
        }

        return new ImageResolution(null, null);
    }

    private record ImageResolution(String imageUrl, String imageFileId) {}

    private void validateExternalImageUrl(String imageUrl) {
        var allowedHosts = imageService.getExternalAllowedHosts();
        if (allowedHosts == null || allowedHosts.isEmpty()) {
            return;
        }

        String host;
        try {
            host = URI.create(imageUrl).getHost();
        } catch (Exception ex) {
            throw new RecipeValidationException("External image URL is invalid.");
        }

        if (host == null || allowedHosts.stream().noneMatch(allowed -> allowed.equalsIgnoreCase(host))) {
            throw new RecipeValidationException("External image host is not allowed.");
        }
    }

    /**
     * Clean up user-entered tags: trim, drop blanks, de-duplicate case-insensitively (keeping the
     * first spelling the user typed) and cap the count so one recipe can't collect hundreds.
     */
    private List<String> normalizeTags(List<String> tags) {
        if (tags == null) {
            return List.of();
        }
        Map<String, String> byLowercase = new LinkedHashMap<>();
        for (String raw : tags) {
            if (raw == null) {
                continue;
            }
            String trimmed = raw.trim();
            if (trimmed.isEmpty() || trimmed.length() > MAX_TAG_LENGTH) {
                continue;
            }
            byLowercase.putIfAbsent(trimmed.toLowerCase(Locale.ROOT), trimmed);
        }
        return byLowercase.values().stream().limit(MAX_TAGS_PER_RECIPE).toList();
    }

    /** Every distinct tag this user has used, for filter options and input suggestions. */
    public List<String> listTagsForUser(String userId) {
        Map<String, String> byLowercase = new LinkedHashMap<>();
        for (Recipe recipe : recipeRepository.findAllByUserIdOrderByCreatedAtDesc(userId)) {
            for (String tag : recipe.getTags()) {
                if (tag != null && !tag.isBlank()) {
                    byLowercase.putIfAbsent(tag.toLowerCase(Locale.ROOT), tag.trim());
                }
            }
        }
        return byLowercase.values().stream()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
    }
}
