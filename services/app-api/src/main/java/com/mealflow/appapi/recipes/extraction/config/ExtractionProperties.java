package com.mealflow.appapi.recipes.extraction.config;

import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Component
@Validated
@ConfigurationProperties(prefix = "app.extraction")
public class ExtractionProperties {

    @Min(1)
    private long maxImageBytes = 10L * 1024 * 1024; // 10 MB

    @Min(1)
    private long maxVideoBytes = 100L * 1024 * 1024; // 100 MB

    @Min(1)
    private int maxImageCount = 5; // max images per image-based extraction

    @Min(0)
    private int maxPerDay = 10;

    @Min(1)
    private int jobTtlMinutes = 60;

    @Min(1)
    private int maxFrames = 8;

    @Min(1)
    private int frameIntervalSeconds = 3;

    @Min(1)
    private int ffmpegTimeoutSeconds = 60;

    @Min(1)
    private int videoMaxDurationSeconds = 300;

    private String ffmpegPath = "ffmpeg";
    private String ffprobePath = "ffprobe";

    private List<String> allowedImageTypes = List.of("image/jpeg", "image/png", "image/webp");

    private List<String> allowedVideoTypes = List.of("video/mp4", "video/quicktime", "video/webm");

    public long getMaxImageBytes() {
        return maxImageBytes;
    }

    public void setMaxImageBytes(long maxImageBytes) {
        this.maxImageBytes = maxImageBytes;
    }

    public long getMaxVideoBytes() {
        return maxVideoBytes;
    }

    public void setMaxVideoBytes(long maxVideoBytes) {
        this.maxVideoBytes = maxVideoBytes;
    }

    public int getMaxImageCount() {
        return maxImageCount;
    }

    public void setMaxImageCount(int maxImageCount) {
        this.maxImageCount = maxImageCount;
    }

    public int getMaxPerDay() {
        return maxPerDay;
    }

    public void setMaxPerDay(int maxPerDay) {
        this.maxPerDay = maxPerDay;
    }

    public int getJobTtlMinutes() {
        return jobTtlMinutes;
    }

    public void setJobTtlMinutes(int jobTtlMinutes) {
        this.jobTtlMinutes = jobTtlMinutes;
    }

    public int getMaxFrames() {
        return maxFrames;
    }

    public void setMaxFrames(int maxFrames) {
        this.maxFrames = maxFrames;
    }

    public int getFrameIntervalSeconds() {
        return frameIntervalSeconds;
    }

    public void setFrameIntervalSeconds(int frameIntervalSeconds) {
        this.frameIntervalSeconds = frameIntervalSeconds;
    }

    public int getFfmpegTimeoutSeconds() {
        return ffmpegTimeoutSeconds;
    }

    public void setFfmpegTimeoutSeconds(int ffmpegTimeoutSeconds) {
        this.ffmpegTimeoutSeconds = ffmpegTimeoutSeconds;
    }

    public int getVideoMaxDurationSeconds() {
        return videoMaxDurationSeconds;
    }

    public void setVideoMaxDurationSeconds(int videoMaxDurationSeconds) {
        this.videoMaxDurationSeconds = videoMaxDurationSeconds;
    }

    public String getFfmpegPath() {
        return ffmpegPath;
    }

    public void setFfmpegPath(String ffmpegPath) {
        this.ffmpegPath = ffmpegPath;
    }

    public String getFfprobePath() {
        return ffprobePath;
    }

    public void setFfprobePath(String ffprobePath) {
        this.ffprobePath = ffprobePath;
    }

    public List<String> getAllowedImageTypes() {
        return allowedImageTypes;
    }

    public void setAllowedImageTypes(List<String> allowedImageTypes) {
        this.allowedImageTypes = allowedImageTypes;
    }

    public List<String> getAllowedVideoTypes() {
        return allowedVideoTypes;
    }

    public void setAllowedVideoTypes(List<String> allowedVideoTypes) {
        this.allowedVideoTypes = allowedVideoTypes;
    }
}
