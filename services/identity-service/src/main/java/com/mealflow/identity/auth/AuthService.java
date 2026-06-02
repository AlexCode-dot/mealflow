package com.mealflow.identity.auth;

import com.mealflow.identity.auth.error.EmailAlreadyInUseException;
import com.mealflow.identity.auth.error.InvalidCredentialsException;
import com.mealflow.identity.auth.verification.EmailVerificationService;
import com.mealflow.identity.auth.verification.error.EmailNotVerifiedException;
import com.mealflow.identity.security.jwt.AccessTokenService;
import com.mealflow.identity.token.service.IssuedRefreshToken;
import com.mealflow.identity.token.service.RefreshTokenService;
import com.mealflow.identity.user.domain.User;
import com.mealflow.identity.user.repository.UserRepository;
import java.time.Clock;
import java.time.Instant;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordService passwordService;
    private final AccessTokenService accessTokenService;
    private final RefreshTokenService refreshTokenService;
    private final EmailVerificationService emailVerificationService;
    private final Clock clock;

    public AuthService(
            UserRepository userRepository,
            PasswordService passwordService,
            AccessTokenService accessTokenService,
            RefreshTokenService refreshTokenService,
            EmailVerificationService emailVerificationService,
            Clock clock) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
        this.accessTokenService = accessTokenService;
        this.refreshTokenService = refreshTokenService;
        this.emailVerificationService = emailVerificationService;
        this.clock = clock;
    }

    /**
     * Create a new account in an unverified state and send a verification code. The caller
     * receives the email back (for the verify screen) but no auth tokens — those are only
     * minted after the user proves they control the email.
     */
    public RegistrationResult register(String email, String password) {
        String normalizedEmail = normalizeEmail(email);

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyInUseException("Email is already in use");
        }

        Instant now = clock.instant();
        String passwordHash = passwordService.hash(password);

        User user = new User(normalizedEmail, passwordHash, false, null, now, now);
        User saved;
        try {
            saved = userRepository.save(user);
        } catch (DuplicateKeyException ex) {
            throw new EmailAlreadyInUseException("Email is already in use");
        }

        emailVerificationService.issue(saved);
        return new RegistrationResult(saved.getId(), saved.getEmail());
    }

    public AuthTokens login(String email, String password) {
        String normalizedEmail = normalizeEmail(email);

        User user = userRepository
                .findByEmail(normalizedEmail)
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (!passwordService.matches(password, user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException(user.getEmail());
        }

        return issueTokens(user.getId());
    }

    public AuthTokens verifyEmail(String email, String code) {
        String normalizedEmail = normalizeEmail(email);
        User user = emailVerificationService.verify(normalizedEmail, code);
        return issueTokens(user.getId());
    }

    public void resendVerification(String email) {
        emailVerificationService.resendFor(normalizeEmail(email));
    }

    public AuthTokens refresh(String refreshTokenRaw) {
        IssuedRefreshToken rotated = refreshTokenService.rotate(refreshTokenRaw);
        String accessToken = accessTokenService.issue(rotated.userId());
        return new AuthTokens(rotated.userId(), accessToken, rotated.rawToken());
    }

    public void logout(String refreshTokenRaw) {
        refreshTokenService.revoke(refreshTokenRaw);
    }

    private AuthTokens issueTokens(String userId) {
        String accessToken = accessTokenService.issue(userId);
        IssuedRefreshToken refresh = refreshTokenService.issueForUser(userId);
        return new AuthTokens(userId, accessToken, refresh.rawToken());
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    /**
     * Internal-only result of a successful auth flow. {@code userId} is here so
     * the controller can attribute audit events to the right user without an
     * extra repository lookup. It is NOT serialized to the wire — the HTTP
     * response is built from a separate DTO.
     */
    public record AuthTokens(String userId, String accessToken, String refreshToken) {}

    public record RegistrationResult(String userId, String email) {}
}
