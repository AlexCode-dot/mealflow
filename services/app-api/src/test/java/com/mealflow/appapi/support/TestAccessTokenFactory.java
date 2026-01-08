// FILE: services/app-api/src/test/java/com/mealflow/appapi/support/TestAccessTokenFactory.java
package com.mealflow.appapi.support;

import java.time.Instant;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

public class TestAccessTokenFactory {

    private final JwtEncoder encoder;

    public TestAccessTokenFactory(JwtEncoder encoder) {
        this.encoder = encoder;
    }

    public String issue(String userId) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("http://test")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(60 * 15))
                .subject(userId)
                .id(UUID.randomUUID().toString())
                .build();

        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
}
