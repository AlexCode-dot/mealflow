// FILE: services/app-api/src/test/java/com/mealflow/appapi/support/TestJwtConfig.java
package com.mealflow.appapi.support;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

@TestConfiguration
public class TestJwtConfig {

    private static KeyPair cached;

    private static synchronized KeyPair keyPair() throws Exception {
        if (cached != null) return cached;
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048);
        cached = kpg.generateKeyPair();
        return cached;
    }

    @Bean
    @Primary
    RSAPublicKey testPublicKey() throws Exception {
        return (RSAPublicKey) keyPair().getPublic();
    }

    @Bean
    @Primary
    RSAPrivateKey testPrivateKey() throws Exception {
        return (RSAPrivateKey) keyPair().getPrivate();
    }

    @Bean
    @Primary
    JwtDecoder testJwtDecoder(RSAPublicKey publicKey) {
        return NimbusJwtDecoder.withPublicKey(publicKey).build();
    }

    @Bean
    @Primary
    JwtEncoder testJwtEncoder(RSAPublicKey publicKey, RSAPrivateKey privateKey) {
        RSAKey rsa = new RSAKey.Builder(publicKey)
                .privateKey(privateKey)
                .keyID("test-kid")
                .build();
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(rsa)));
    }
}
