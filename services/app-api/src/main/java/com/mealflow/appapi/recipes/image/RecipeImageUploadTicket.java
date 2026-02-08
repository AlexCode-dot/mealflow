package com.mealflow.appapi.recipes.image;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("recipe_image_upload_tickets")
public class RecipeImageUploadTicket {
    @Id
    private String id;
    private String userId;
    private String imageUrl;
    private String imageFileId;
    private Instant createdAt;
    private boolean consumed;

    public RecipeImageUploadTicket() {}

    public RecipeImageUploadTicket(
            String userId, String imageUrl, String imageFileId, Instant createdAt, boolean consumed) {
        this.userId = userId;
        this.imageUrl = imageUrl;
        this.imageFileId = imageFileId;
        this.createdAt = createdAt;
        this.consumed = consumed;
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isConsumed() {
        return consumed;
    }

    public void setConsumed(boolean consumed) {
        this.consumed = consumed;
    }
}
