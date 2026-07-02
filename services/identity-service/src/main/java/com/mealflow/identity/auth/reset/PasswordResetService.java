package com.mealflow.identity.auth.reset;

import com.mealflow.identity.auth.PasswordService;
import com.mealflow.identity.auth.verification.VerificationCodeService;
import com.mealflow.identity.auth.verification.VerificationProperties;
import com.mealflow.identity.auth.verification.email.ResendClient;
import com.mealflow.identity.auth.verification.email.ResendProperties;
import com.mealflow.identity.auth.verification.error.InvalidVerificationCodeException;
import com.mealflow.identity.token.repository.RefreshTokenRepository;
import com.mealflow.identity.user.domain.User;
import com.mealflow.identity.user.repository.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Password-reset flow, mirroring {@code EmailVerificationService}: a 6-digit code is emailed, its
 * hash stored, and the reset only succeeds against a fresh, unconsumed, non-expired code. The
 * request step never reveals whether an email exists (no user enumeration) and applies a per-email
 * cooldown so a single address can't be spammed.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private final PasswordResetRepository repository;
    private final UserRepository userRepository;
    private final VerificationCodeService codeService;
    private final PasswordService passwordService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ResendClient resendClient;
    private final ResendProperties resendProperties;
    private final VerificationProperties verificationProperties;
    private final Clock clock;

    public PasswordResetService(
            PasswordResetRepository repository,
            UserRepository userRepository,
            VerificationCodeService codeService,
            PasswordService passwordService,
            RefreshTokenRepository refreshTokenRepository,
            ResendClient resendClient,
            ResendProperties resendProperties,
            VerificationProperties verificationProperties,
            Clock clock) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.codeService = codeService;
        this.passwordService = passwordService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.resendClient = resendClient;
        this.resendProperties = resendProperties;
        this.verificationProperties = verificationProperties;
        this.clock = clock;
    }

    /**
     * Issue a reset code for the given (normalized) email and send it. Silently succeeds when the
     * email is unknown or is still within the resend cooldown — callers must not be able to tell.
     */
    public void request(String email) {
        Instant now = clock.instant();

        Optional<PasswordReset> latest = repository.findFirstByEmailAndConsumedFalseOrderByCreatedAtDesc(email);
        if (latest.isPresent()) {
            Instant earliestResend =
                    latest.get().getCreatedAt().plusSeconds(verificationProperties.getResendCooldownSeconds());
            if (earliestResend.isAfter(now)) {
                return;
            }
        }

        Optional<User> maybeUser = userRepository.findByEmail(email);
        if (maybeUser.isEmpty()) {
            // Don't reveal whether the email exists — silently succeed.
            log.info("Password reset requested for unknown email <{}>", email);
            return;
        }

        User user = maybeUser.get();
        repository.deleteByEmailAndConsumedFalse(email);

        String code = codeService.generate();
        Instant expiresAt = now.plus(Duration.ofMinutes(verificationProperties.getCodeTtlMinutes()));
        repository.save(new PasswordReset(user.getId(), email, codeService.hash(code), expiresAt, now));

        sendResetEmail(email, code);
    }

    /**
     * Verify a reset code and set the new password. On success the user's other sessions are
     * revoked and (since receiving the code proves ownership) the email is marked verified.
     */
    public void reset(String email, String code, String newPassword) {
        Instant now = clock.instant();

        PasswordReset record = repository
                .findFirstByEmailAndConsumedFalseOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new InvalidVerificationCodeException("No active reset code"));

        if (record.getExpiresAt().isBefore(now)) {
            throw new InvalidVerificationCodeException("Reset code has expired");
        }
        if (record.getAttempts() >= verificationProperties.getMaxAttemptsPerCode()) {
            throw new InvalidVerificationCodeException("Too many attempts. Request a new code.");
        }
        if (!codeService.matches(code, record.getCodeHash())) {
            record.incrementAttempts(now);
            repository.save(record);
            throw new InvalidVerificationCodeException("Incorrect reset code");
        }

        record.markConsumed(now);
        repository.save(record);

        User user = userRepository
                .findById(record.getUserId())
                .orElseThrow(() -> new InvalidVerificationCodeException("No active reset code"));
        user.setPasswordHash(passwordService.hash(newPassword));
        if (!user.isEmailVerified()) {
            // Receiving the reset code proves ownership of the address.
            user.markEmailVerified(now);
        }
        userRepository.save(user);

        // Revoke every existing session — a reset should invalidate old refresh tokens.
        refreshTokenRepository.deleteByUserId(user.getId());
    }

    private void sendResetEmail(String email, String code) {
        String product = resendProperties.getProductName();
        String subject = product + " password reset code";
        String text = "Your " + product + " password reset code is " + code + ".\n\n"
                + "It expires in " + verificationProperties.getCodeTtlMinutes()
                + " minutes. If you didn't request this, you can ignore this email.";
        String html = "<div style=\"font-family:-apple-system,Segoe UI,Roboto,sans-serif;"
                + "max-width:480px;margin:0 auto;padding:32px 16px;color:#1f2937;\">"
                + "<h2 style=\"margin:0 0 16px;font-size:20px;\">"
                + product + " password reset</h2>"
                + "<p style=\"margin:0 0 24px;line-height:1.5;\">Enter this 6-digit code in the app to set a new password:</p>"
                + "<div style=\"font-size:32px;letter-spacing:8px;font-weight:700;background:#f3f4f6;"
                + "padding:16px 24px;border-radius:12px;text-align:center;margin:0 0 24px;\">"
                + code + "</div>"
                + "<p style=\"margin:0;color:#6b7280;font-size:13px;line-height:1.5;\">"
                + "Expires in " + verificationProperties.getCodeTtlMinutes() + " minutes. "
                + "If you didn't request this, you can ignore this email."
                + "</p></div>";
        resendClient.send(email, subject, html, text);
    }
}
