package com.mealflow.identity.security.rsa;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "security.rsa")
public record RsaKeyProperties(String privateKeyPath, String publicKeyPath) {}
