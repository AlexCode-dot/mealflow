package com.mealflow.identity.security.token;

import com.mealflow.identity.common.error.InvalidRefreshTokenException;
import com.mealflow.identity.common.error.RefreshTokenReplayException;
import com.mealflow.identity.domain.token.RefreshToken;
import com.mealflow.identity.repository.RefreshTokenRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final RefreshTokenGenerator refreshTokenGenerator;
    private final TokenHashService tokenHashService;
    private final TokenProperties tokenProperties;
    private final Clock clock;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            RefreshTokenGenerator refreshTokenGenerator,
            TokenHashService tokenHashService,
            TokenProperties tokenProperties,
            Clock clock) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenGenerator = refreshTokenGenerator;
        this.tokenHashService = tokenHashService;
        this.tokenProperties = tokenProperties;
        this.clock = clock;
    }

    public IssuedRefreshToken issueForUser(String userId) {
        Instant now = clock.instant();

        String rawToken = refreshTokenGenerator.generate();
        String tokenHash = tokenHashService.sha256(rawToken);

        Instant expiresAt = now.plusSeconds(tokenProperties.refreshTokenTtlDays() * 24L * 60L * 60L);

        RefreshToken doc = new RefreshToken(userId, tokenHash, expiresAt, false, null, now);

        refreshTokenRepository.save(doc);

        return new IssuedRefreshToken(rawToken, tokenHash, expiresAt);
    }

    public IssuedRefreshToken rotate(String rawToken) {
        Instant now = clock.instant();
        String tokenHash = tokenHashService.sha256(rawToken);

        RefreshToken existing = refreshTokenRepository
                .findByTokenHash(tokenHash)
                .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token is invalid"));

        if (existing.isExpired(now)) {
            throw new InvalidRefreshTokenException("Refresh token has expired");
        }

        // Replay detection: token already rotated/revoked
        if (existing.isRevoked()) {
            // If it was replaced, this strongly indicates reuse (replay) of an old token.
            if (existing.getReplacedByTokenHash() != null) {
                throw new RefreshTokenReplayException("Refresh token replay detected");
            }
            throw new InvalidRefreshTokenException("Refresh token is revoked");
        }

        // Issue the new token
        String newRawToken = refreshTokenGenerator.generate();
        String newTokenHash = tokenHashService.sha256(newRawToken);
        Instant newExpiresAt = now.plusSeconds(tokenProperties.refreshTokenTtlDays() * 24L * 60L * 60L);

        RefreshToken replacement = new RefreshToken(existing.getUserId(), newTokenHash, newExpiresAt, false, null, now);

        // Mark old token revoked and link it to the new token hash
        existing.revoke(newTokenHash);

        // Persist both changes
        refreshTokenRepository.save(existing);
        refreshTokenRepository.save(replacement);

        return new IssuedRefreshToken(newRawToken, newTokenHash, newExpiresAt);
    }

    public void revoke(String rawToken) {
        String tokenHash = tokenHashService.sha256(rawToken);

        Optional<RefreshToken> existing = refreshTokenRepository.findByTokenHash(tokenHash);
        if (existing.isEmpty()) {
            return; // idempotent logout
        }

        RefreshToken token = existing.get();
        if (!token.isRevoked()) {
            token.revoke(null);
            refreshTokenRepository.save(token);
        }
    }
}
