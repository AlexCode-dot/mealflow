package com.mealflow.identity.auth.verification;

import com.mealflow.identity.auth.verification.email.ResendClient;
import com.mealflow.identity.auth.verification.email.ResendProperties;
import com.mealflow.identity.auth.verification.error.InvalidVerificationCodeException;
import com.mealflow.identity.auth.verification.error.VerificationResendCooldownException;
import com.mealflow.identity.user.domain.User;
import com.mealflow.identity.user.repository.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class EmailVerificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);

    private final EmailVerificationRepository repository;
    private final UserRepository userRepository;
    private final VerificationCodeService codeService;
    private final ResendClient resendClient;
    private final ResendProperties resendProperties;
    private final VerificationProperties verificationProperties;
    private final Clock clock;

    public EmailVerificationService(
            EmailVerificationRepository repository,
            UserRepository userRepository,
            VerificationCodeService codeService,
            ResendClient resendClient,
            ResendProperties resendProperties,
            VerificationProperties verificationProperties,
            Clock clock) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.codeService = codeService;
        this.resendClient = resendClient;
        this.resendProperties = resendProperties;
        this.verificationProperties = verificationProperties;
        this.clock = clock;
    }

    /**
     * Generate a fresh verification code, persist its hash, and send it via email.
     * Invalidates any previous unconsumed code for the same email so an old code can't be reused.
     */
    public void issue(User user) {
        String email = user.getEmail();
        Instant now = clock.instant();
        repository.deleteByEmailAndConsumedFalse(email);

        String code = codeService.generate();
        Instant expiresAt = now.plus(Duration.ofMinutes(verificationProperties.getCodeTtlMinutes()));
        EmailVerification record = new EmailVerification(user.getId(), email, codeService.hash(code), expiresAt, now);
        repository.save(record);

        sendCodeEmail(email, code);
    }

    /**
     * Verify a code against the latest unconsumed record for the given email.
     *
     * @return the User whose email has now been marked verified.
     */
    public User verify(String email, String code) {
        Instant now = clock.instant();
        EmailVerification record = repository
                .findFirstByEmailAndConsumedFalseOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new InvalidVerificationCodeException("No active verification code"));

        if (record.getExpiresAt().isBefore(now)) {
            throw new InvalidVerificationCodeException("Verification code has expired");
        }
        if (record.getAttempts() >= verificationProperties.getMaxAttemptsPerCode()) {
            throw new InvalidVerificationCodeException("Too many attempts. Request a new code.");
        }
        if (!codeService.matches(code, record.getCodeHash())) {
            record.incrementAttempts(now);
            repository.save(record);
            throw new InvalidVerificationCodeException("Incorrect verification code");
        }

        record.markConsumed(now);
        repository.save(record);

        User user = userRepository
                .findById(record.getUserId())
                .orElseThrow(() -> new InvalidVerificationCodeException("No active verification code"));
        user.markEmailVerified(now);
        return userRepository.save(user);
    }

    /**
     * Re-send a verification code for the given email. Respects a per-email cooldown window so
     * a single email can't be the target of unlimited send attempts.
     */
    public void resendFor(String email) {
        Instant now = clock.instant();
        Optional<EmailVerification> latest = repository.findFirstByEmailAndConsumedFalseOrderByCreatedAtDesc(email);
        if (latest.isPresent()) {
            Instant earliestResend =
                    latest.get().getCreatedAt().plusSeconds(verificationProperties.getResendCooldownSeconds());
            if (earliestResend.isAfter(now)) {
                long waitSeconds = Duration.between(now, earliestResend).getSeconds();
                throw new VerificationResendCooldownException(Math.max(1, waitSeconds));
            }
        }

        Optional<User> maybeUser = userRepository.findByEmail(email);
        if (maybeUser.isEmpty() || maybeUser.get().isEmailVerified()) {
            // Don't reveal whether the email exists or is already verified — silently succeed.
            log.info("Verification resend requested for non-eligible email <{}>", email);
            return;
        }
        issue(maybeUser.get());
    }

    private void sendCodeEmail(String email, String code) {
        String product = resendProperties.getProductName();
        String subject = product + " verification code";
        String text = "Your " + product + " verification code is " + code + ".\n\n"
                + "It expires in " + verificationProperties.getCodeTtlMinutes()
                + " minutes. If you didn't request this, you can ignore this email.";
        String html = "<div style=\"font-family:-apple-system,Segoe UI,Roboto,sans-serif;"
                + "max-width:480px;margin:0 auto;padding:32px 16px;color:#1f2937;\">"
                + "<h2 style=\"margin:0 0 16px;font-size:20px;\">"
                + product + " verification code</h2>"
                + "<p style=\"margin:0 0 24px;line-height:1.5;\">Enter this 6-digit code in the app:</p>"
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
