package com.mealflow.appapi.integrations.v1;

import org.springframework.http.HttpStatus;

/** 429 from {@link FromPlanRateLimiter}; rendered with {@code Retry-After} like the global rate limit. */
public class FromPlanRateLimitedException extends IntegrationApiException {

    public static final String CODE = "from_plan_rate_limited";

    private final long retryAfterSeconds;

    public FromPlanRateLimitedException(String detail, long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, detail, CODE);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
