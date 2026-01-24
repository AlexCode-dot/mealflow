package com.mealflow.identity.web.ratelimit;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Component
@Validated
@ConfigurationProperties(prefix = "app.ratelimit")
public class RateLimitProperties {

    private boolean enabled = true;

    @Min(1)
    private int loginPerMinute = 10;

    @Min(1)
    private int registerPerMinute = 5;

    @Min(1)
    private int refreshPerMinute = 30;

    @Min(1)
    private int logoutPerMinute = 60;

    @Min(1)
    private int jwksPerMinute = 120;

    @Min(1)
    private int bucketTtlMinutes = 15;

    @Min(100)
    private int maxBuckets = 10_000;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getLoginPerMinute() {
        return loginPerMinute;
    }

    public void setLoginPerMinute(int loginPerMinute) {
        this.loginPerMinute = loginPerMinute;
    }

    public int getRegisterPerMinute() {
        return registerPerMinute;
    }

    public void setRegisterPerMinute(int registerPerMinute) {
        this.registerPerMinute = registerPerMinute;
    }

    public int getRefreshPerMinute() {
        return refreshPerMinute;
    }

    public void setRefreshPerMinute(int refreshPerMinute) {
        this.refreshPerMinute = refreshPerMinute;
    }

    public int getLogoutPerMinute() {
        return logoutPerMinute;
    }

    public void setLogoutPerMinute(int logoutPerMinute) {
        this.logoutPerMinute = logoutPerMinute;
    }

    public int getJwksPerMinute() {
        return jwksPerMinute;
    }

    public void setJwksPerMinute(int jwksPerMinute) {
        this.jwksPerMinute = jwksPerMinute;
    }

    public int getBucketTtlMinutes() {
        return bucketTtlMinutes;
    }

    public void setBucketTtlMinutes(int bucketTtlMinutes) {
        this.bucketTtlMinutes = bucketTtlMinutes;
    }

    public int getMaxBuckets() {
        return maxBuckets;
    }

    public void setMaxBuckets(int maxBuckets) {
        this.maxBuckets = maxBuckets;
    }
}
