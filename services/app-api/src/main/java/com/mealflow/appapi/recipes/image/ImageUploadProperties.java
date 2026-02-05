package com.mealflow.appapi.recipes.image;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.images")
public class ImageUploadProperties {

    private long maxUploadBytes;
    private int maxPerUser;
    private int maxPerDay;
    private List<String> allowedTypes;

    public long getMaxUploadBytes() {
        return maxUploadBytes;
    }

    public void setMaxUploadBytes(long maxUploadBytes) {
        this.maxUploadBytes = maxUploadBytes;
    }

    public int getMaxPerUser() {
        return maxPerUser;
    }

    public void setMaxPerUser(int maxPerUser) {
        this.maxPerUser = maxPerUser;
    }

    public int getMaxPerDay() {
        return maxPerDay;
    }

    public void setMaxPerDay(int maxPerDay) {
        this.maxPerDay = maxPerDay;
    }

    public List<String> getAllowedTypes() {
        return allowedTypes;
    }

    public void setAllowedTypes(List<String> allowedTypes) {
        this.allowedTypes = allowedTypes;
    }
}
