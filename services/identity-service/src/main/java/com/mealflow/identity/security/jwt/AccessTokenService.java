package com.mealflow.identity.security.jwt;

import com.mealflow.identity.security.config.TokenProperties;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class AccessTokenService {

    private final JwtEncoder jwtEncoder;
    private final TokenProperties tokenProperties;
    private final Clock clock;

    public AccessTokenService(JwtEncoder jwtEncoder, TokenProperties tokenProperties, Clock clock) {
        this.jwtEncoder = jwtEncoder;
        this.tokenProperties = tokenProperties;
        this.clock = clock;
    }

    public String issue(String userId) {
        Instant now = clock.instant();
        Instant expiresAt = now.plusSeconds(tokenProperties.accessTokenTtlMinutes() * 60L);

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(tokenProperties.issuer())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(userId)
                .id(UUID.randomUUID().toString()) // jti
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
}
