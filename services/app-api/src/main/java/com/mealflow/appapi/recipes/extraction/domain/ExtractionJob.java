package com.mealflow.appapi.recipes.extraction.domain;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "extraction_jobs")
public class ExtractionJob {

    @Id
    private String id;

    @Indexed
    private String userId;

    private ExtractionSourceType sourceType;
    private ExtractionStatus status;

    private String contentType;
    private long sizeBytes;

    private String locale;
    private String unitSystem;

    private RecipeDraft draft;
    private String errorCode;
    private String errorMessage;

    private String thumbnailUrl;
    private String thumbnailFileId;

    private String acceptedRecipeId;

    private Instant createdAt;
    private Instant updatedAt;

    public ExtractionJob() {}

    public ExtractionJob(
            String userId,
            ExtractionSourceType sourceType,
            ExtractionStatus status,
            String contentType,
            long sizeBytes,
            String locale,
            String unitSystem,
            Instant now) {
        this.userId = userId;
        this.sourceType = sourceType;
        this.status = status;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.locale = locale;
        this.unitSystem = unitSystem;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public ExtractionSourceType getSourceType() {
        return sourceType;
    }

    public void setSourceType(ExtractionSourceType sourceType) {
        this.sourceType = sourceType;
    }

    public ExtractionStatus getStatus() {
        return status;
    }

    public void setStatus(ExtractionStatus status) {
        this.status = status;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }

    public String getUnitSystem() {
        return unitSystem;
    }

    public void setUnitSystem(String unitSystem) {
        this.unitSystem = unitSystem;
    }

    public RecipeDraft getDraft() {
        return draft;
    }

    public void setDraft(RecipeDraft draft) {
        this.draft = draft;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public String getAcceptedRecipeId() {
        return acceptedRecipeId;
    }

    public void setAcceptedRecipeId(String acceptedRecipeId) {
        this.acceptedRecipeId = acceptedRecipeId;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public String getThumbnailFileId() {
        return thumbnailFileId;
    }

    public void setThumbnailFileId(String thumbnailFileId) {
        this.thumbnailFileId = thumbnailFileId;
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
