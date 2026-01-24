package com.mealflow.appapi.web.ratelimit;

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
    private int apiPerMinute = 120;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getApiPerMinute() {
        return apiPerMinute;
    }

    public void setApiPerMinute(int apiPerMinute) {
        this.apiPerMinute = apiPerMinute;
    }
}
