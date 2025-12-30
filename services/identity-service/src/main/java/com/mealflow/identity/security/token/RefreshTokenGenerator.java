package com.mealflow.identity.security.token;

import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.stereotype.Component;

@Component
public class RefreshTokenGenerator {

    private final SecureRandom secureRandom = new SecureRandom();
    private final Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();

    public String generate() {
        byte[] bytes = new byte[64]; // 512 bits
        secureRandom.nextBytes(bytes);
        return encoder.encodeToString(bytes);
    }
}
