package com.mealflow.appapi.recipes.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "recipes")
public class Recipe {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String title;
    private String description;
    private String imageUrl;
    private String imageFileId;

    private List<Ingredient> ingredients = new ArrayList<>();
    private List<String> steps = new ArrayList<>();

    private Integer cookingTimeMinutes;
    private Integer portions;
    private String category;

    private boolean fromExternal = false;

    private Instant createdAt;
    private Instant updatedAt;

    public Recipe() {}

    public Recipe(
            String userId,
            String title,
            String description,
            String imageUrl,
            String imageFileId,
            List<Ingredient> ingredients,
            List<String> steps,
            Integer cookingTimeMinutes,
            Integer portions,
            String category,
            boolean fromExternal,
            Instant createdAt,
            Instant updatedAt) {

        this.userId = userId;
        this.title = title;
        this.description = description;
        this.imageUrl = imageUrl;
        this.imageFileId = imageFileId;
        this.ingredients = ingredients != null ? ingredients : new ArrayList<>();
        this.steps = steps != null ? steps : new ArrayList<>();
        this.cookingTimeMinutes = cookingTimeMinutes;
        this.portions = portions;
        this.category = category;
        this.fromExternal = fromExternal;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public void applyPatch(
            String title,
            String description,
            String imageUrl,
            String imageFileId,
            List<Ingredient> ingredients,
            List<String> steps,
            Integer cookingTimeMinutes,
            Integer portions,
            String category,
            Boolean fromExternal,
            Instant now) {
        if (title != null) {
            this.title = title.trim();
        }
        if (description != null) {
            this.description = description;
        }
        if (imageUrl != null) {
            this.imageUrl = imageUrl;
        }
        if (imageFileId != null) {
            this.imageFileId = imageFileId;
        }
        if (ingredients != null) {
            this.ingredients = ingredients;
        }
        if (steps != null) {
            this.steps = steps;
        }
        if (cookingTimeMinutes != null) {
            this.cookingTimeMinutes = cookingTimeMinutes;
        }
        if (portions != null) {
            this.portions = portions;
        }
        if (category != null) {
            this.category = category;
        }
        if (fromExternal != null) {
            this.fromExternal = fromExternal;
        }
        this.updatedAt = now;
    }

    // Getters + setters

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getImageFileId() {
        return imageFileId;
    }

    public void setImageFileId(String imageFileId) {
        this.imageFileId = imageFileId;
    }

    public List<Ingredient> getIngredients() {
        return ingredients;
    }

    public void setIngredients(List<Ingredient> ingredients) {
        this.ingredients = ingredients != null ? ingredients : new ArrayList<>();
    }

    public List<String> getSteps() {
        return steps;
    }

    public void setSteps(List<String> steps) {
        this.steps = steps != null ? steps : new ArrayList<>();
    }

    public Integer getCookingTimeMinutes() {
        return cookingTimeMinutes;
    }

    public void setCookingTimeMinutes(Integer cookingTimeMinutes) {
        this.cookingTimeMinutes = cookingTimeMinutes;
    }

    public Integer getPortions() {
        return portions;
    }

    public void setPortions(Integer portions) {
        this.portions = portions;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public boolean isFromExternal() {
        return fromExternal;
    }

    public void setFromExternal(boolean fromExternal) {
        this.fromExternal = fromExternal;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
