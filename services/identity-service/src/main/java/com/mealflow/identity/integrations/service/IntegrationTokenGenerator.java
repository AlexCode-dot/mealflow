package com.mealflow.identity.integrations.service;

import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class IntegrationTokenGenerator {

    public static final String PREFIX = "mfi_";

    private final SecureRandom secureRandom = new SecureRandom();
    private final Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
    private final String envSegment;

    public IntegrationTokenGenerator(@Value("${integration-tokens.env-segment:dev}") String envSegment) {
        this.envSegment = envSegment;
    }

    public String generate() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return PREFIX + envSegment + "_" + encoder.encodeToString(bytes);
    }

    public String preview(String rawToken) {
        return rawToken.length() <= 12 ? rawToken : rawToken.substring(0, 12);
    }
}
