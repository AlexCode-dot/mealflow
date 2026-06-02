package com.mealflow.identity.auth.verification;

import java.security.SecureRandom;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Generates and verifies 6-digit verification codes. Codes are hashed with BCrypt so an attacker
 * with DB read access can't brute-force the short numeric space via a precomputed rainbow table.
 */
@Service
public class VerificationCodeService {

    private static final int CODE_LENGTH = 6;
    private static final int CODE_BOUND = 1_000_000; // 0..999999

    private final SecureRandom random = new SecureRandom();
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);

    public String generate() {
        int value = random.nextInt(CODE_BOUND);
        return String.format("%0" + CODE_LENGTH + "d", value);
    }

    public String hash(String code) {
        return encoder.encode(code);
    }

    public boolean matches(String code, String hash) {
        if (code == null || hash == null) {
            return false;
        }
        return encoder.matches(code, hash);
    }
}
