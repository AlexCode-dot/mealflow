package com.mealflow.identity.auth.verification;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Component
@Validated
@ConfigurationProperties(prefix = "app.verification")
public class VerificationProperties {

    @Min(1)
    private int codeTtlMinutes = 10;

    @Min(1)
    private int maxAttemptsPerCode = 5;

    @Min(1)
    private int resendCooldownSeconds = 60;

    public int getCodeTtlMinutes() {
        return codeTtlMinutes;
    }

    public void setCodeTtlMinutes(int codeTtlMinutes) {
        this.codeTtlMinutes = codeTtlMinutes;
    }

    public int getMaxAttemptsPerCode() {
        return maxAttemptsPerCode;
    }

    public void setMaxAttemptsPerCode(int maxAttemptsPerCode) {
        this.maxAttemptsPerCode = maxAttemptsPerCode;
    }

    public int getResendCooldownSeconds() {
        return resendCooldownSeconds;
    }

    public void setResendCooldownSeconds(int resendCooldownSeconds) {
        this.resendCooldownSeconds = resendCooldownSeconds;
    }
}
