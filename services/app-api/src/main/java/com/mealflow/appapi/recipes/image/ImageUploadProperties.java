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
    private int ticketTtlMinutes;
    private List<String> allowedTypes;
    private List<String> externalAllowedHosts;

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

    public int getTicketTtlMinutes() {
        return ticketTtlMinutes;
    }

    public void setTicketTtlMinutes(int ticketTtlMinutes) {
        this.ticketTtlMinutes = ticketTtlMinutes;
    }

    public List<String> getAllowedTypes() {
        return allowedTypes;
    }

    public void setAllowedTypes(List<String> allowedTypes) {
        this.allowedTypes = allowedTypes;
    }

    public List<String> getExternalAllowedHosts() {
        return externalAllowedHosts;
    }

    public void setExternalAllowedHosts(List<String> externalAllowedHosts) {
        this.externalAllowedHosts = externalAllowedHosts;
    }
}
