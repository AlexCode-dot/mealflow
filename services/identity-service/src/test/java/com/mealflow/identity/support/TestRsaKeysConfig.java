package com.mealflow.identity.support;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration
public class TestRsaKeysConfig {

    @Bean
    @Primary
    RSAPublicKey testRsaPublicKey() throws Exception {
        return (RSAPublicKey) keyPair().getPublic();
    }

    @Bean
    @Primary
    RSAPrivateKey testRsaPrivateKey() throws Exception {
        return (RSAPrivateKey) keyPair().getPrivate();
    }

    // Keep one keypair per test context
    private static KeyPair cached;

    private static synchronized KeyPair keyPair() throws Exception {
        if (cached != null) return cached;

        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048);
        cached = kpg.generateKeyPair();
        return cached;
    }
}
