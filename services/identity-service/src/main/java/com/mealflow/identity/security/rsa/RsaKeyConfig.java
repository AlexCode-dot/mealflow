package com.mealflow.identity.security.rsa;

import java.io.IOException;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

@Configuration
@EnableConfigurationProperties(RsaKeyProperties.class)
public class RsaKeyConfig {

    private final ResourceLoader resourceLoader;
    private final RsaKeyProperties props;

    public RsaKeyConfig(ResourceLoader resourceLoader, RsaKeyProperties props) {
        this.resourceLoader = resourceLoader;
        this.props = props;
    }

    @Bean
    public RSAPrivateKey rsaPrivateKey() {
        return (RSAPrivateKey) readKey(props.privateKeyPath(), true);
    }

    @Bean
    public RSAPublicKey rsaPublicKey() {
        return (RSAPublicKey) readKey(props.publicKeyPath(), false);
    }

    private Object readKey(String location, boolean isPrivate) {
        try {
            Resource resource = resourceLoader.getResource(location);
            String pem = new String(resource.getInputStream().readAllBytes());

            String normalized = pem.replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s", "");

            byte[] der = Base64.getDecoder().decode(normalized);

            KeyFactory kf = KeyFactory.getInstance("RSA");

            if (isPrivate) {
                return kf.generatePrivate(new PKCS8EncodedKeySpec(der));
            }
            return kf.generatePublic(new X509EncodedKeySpec(der));

        } catch (IOException e) {
            throw new IllegalStateException("Failed to read RSA key from: " + location, e);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse RSA key from: " + location, e);
        }
    }
}
