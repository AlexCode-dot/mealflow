package com.mealflow.identity.security.jwt;

import static org.junit.jupiter.api.Assertions.*;

import com.mealflow.identity.support.MongoTestContainerConfig;
import com.mealflow.identity.support.TestRsaKeysConfig;
import java.security.interfaces.RSAPublicKey;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestRsaKeysConfig.class)
class AccessTokenServiceIT extends MongoTestContainerConfig {

    private final AccessTokenService accessTokenService;
    private final RSAPublicKey publicKey;

    @Autowired
    AccessTokenServiceIT(AccessTokenService accessTokenService, RSAPublicKey publicKey) {
        this.accessTokenService = accessTokenService;
        this.publicKey = publicKey;
    }

    @Test
    void issue_shouldCreateVerifiableJwt_withSubject() {
        String token = accessTokenService.issue("user-123");

        JwtDecoder decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();
        Jwt jwt = decoder.decode(token);

        assertEquals("user-123", jwt.getSubject());
        assertNotNull(jwt.getIssuedAt());
        assertNotNull(jwt.getExpiresAt());
        assertNotNull(jwt.getId());
    }
}
