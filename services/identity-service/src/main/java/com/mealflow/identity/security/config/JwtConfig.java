package com.mealflow.identity.security.config;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

@Configuration
public class JwtConfig {

    @Bean
    public RSAKey rsaJwk(RSAPublicKey publicKey, RSAPrivateKey privateKey) {
        return new RSAKey.Builder(publicKey)
                .privateKey(privateKey)
                .keyID("mealflow-identity-rs256") // stable kid for JWKS clients
                .build();
    }

    @Bean
    public JwtEncoder jwtEncoder(RSAKey rsaJwk) {
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(rsaJwk)));
    }
}
