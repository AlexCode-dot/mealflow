package com.mealflow.identity.security.password;

import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class PasswordService {

    private final Argon2PasswordEncoder encoder;

    public PasswordService() {

        int saltLength = 16;
        int hashLength = 32;
        int parallelism = 1;
        int memoryKb = 65536; // 64 MB
        int iterations = 3;

        this.encoder = new Argon2PasswordEncoder(saltLength, hashLength, parallelism, memoryKb, iterations);
    }

    public String hash(String rawPassword) {
        return encoder.encode(rawPassword);
    }

    public boolean matches(String rawPassword, String passwordHash) {
        return encoder.matches(rawPassword, passwordHash);
    }
}
