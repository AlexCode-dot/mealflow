package com.mealflow.identity.auth;

import com.mealflow.identity.auth.error.EmailAlreadyInUseException;
import com.mealflow.identity.auth.error.InvalidCredentialsException;
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
    private final Clock clock;

    public AuthService(
            UserRepository userRepository,
            PasswordService passwordService,
            AccessTokenService accessTokenService,
            RefreshTokenService refreshTokenService,
            Clock clock) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
        this.accessTokenService = accessTokenService;
        this.refreshTokenService = refreshTokenService;
        this.clock = clock;
    }

    public AuthTokens register(String email, String password) {
        String normalizedEmail = normalizeEmail(email);

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyInUseException("Email is already in use");
        }

        Instant now = clock.instant();
        String passwordHash = passwordService.hash(password);

        User user = new User(normalizedEmail, passwordHash, now, now);
        User saved;
        try {
          saved = userRepository.save(user);
        } catch (DuplicateKeyException ex) {
          // Covers race condition where another request created the same email after existsByEmail check.
          throw new EmailAlreadyInUseException("Email is already in use");
        }

        String accessToken = accessTokenService.issue(saved.getId());
        IssuedRefreshToken refresh = refreshTokenService.issueForUser(saved.getId());

        return new AuthTokens(accessToken, refresh.rawToken());
    }

    public AuthTokens login(String email, String password) {
        String normalizedEmail = normalizeEmail(email);

        User user = userRepository
                .findByEmail(normalizedEmail)
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (!passwordService.matches(password, user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        String accessToken = accessTokenService.issue(user.getId());
        IssuedRefreshToken refresh = refreshTokenService.issueForUser(user.getId());

        return new AuthTokens(accessToken, refresh.rawToken());
    }

    public AuthTokens refresh(String refreshTokenRaw) {
        IssuedRefreshToken rotated = refreshTokenService.rotate(refreshTokenRaw);

        String accessToken = accessTokenService.issue(rotated.userId());

        return new AuthTokens(accessToken, rotated.rawToken());
    }

    public void logout(String refreshTokenRaw) {
        refreshTokenService.revoke(refreshTokenRaw);
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    public record AuthTokens(String accessToken, String refreshToken) {}
}
