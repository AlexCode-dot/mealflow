package com.mealflow.identity.security.token;

import static org.junit.jupiter.api.Assertions.*;

import com.mealflow.identity.common.error.InvalidRefreshTokenException;
import com.mealflow.identity.common.error.RefreshTokenReplayException;
import com.mealflow.identity.domain.token.RefreshToken;
import com.mealflow.identity.repository.RefreshTokenRepository;
import com.mealflow.identity.support.MongoTestContainerConfig;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class RefreshTokenServiceIT extends MongoTestContainerConfig {

    private static final Instant FIXED_NOW = Instant.parse("2025-01-01T00:00:00Z");
    private static final long REFRESH_TTL_DAYS = 30L; // matches application-test.properties

    private final RefreshTokenService refreshTokenService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TokenHashService tokenHashService;

    @Autowired
    RefreshTokenServiceIT(
            RefreshTokenService refreshTokenService,
            RefreshTokenRepository refreshTokenRepository,
            TokenHashService tokenHashService) {
        this.refreshTokenService = refreshTokenService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.tokenHashService = tokenHashService;
    }

    @AfterEach
    void cleanDb() {
        refreshTokenRepository.deleteAll();
    }

    @Test
    void rotate_shouldRevokeOldToken_andPersistReplacement() {
        // Given
        IssuedRefreshToken issued = refreshTokenService.issueForUser("user-123");

        // When
        IssuedRefreshToken rotated = refreshTokenService.rotate(issued.rawToken());

        // Then (raw tokens + hashes must differ)
        assertNotEquals(issued.rawToken(), rotated.rawToken());
        assertNotEquals(issued.tokenHash(), rotated.tokenHash());

        RefreshToken oldDoc = requireToken(issued.tokenHash(), "old");
        RefreshToken newDoc = requireToken(rotated.tokenHash(), "new");

        assertRevokedToken(oldDoc, "user-123", rotated.tokenHash());
        assertActiveToken(newDoc, "user-123");

        assertTimestamps(oldDoc, FIXED_NOW);
        assertTimestamps(newDoc, FIXED_NOW);
    }

    @Test
    void rotate_shouldThrowReplayException_whenOldTokenIsReusedAfterRotation() {
        // Given
        IssuedRefreshToken issued = refreshTokenService.issueForUser("user-999");

        // When
        refreshTokenService.rotate(issued.rawToken());

        // Then
        assertThrows(RefreshTokenReplayException.class, () -> refreshTokenService.rotate(issued.rawToken()));
    }

    @Test
    void rotate_shouldThrowInvalidRefreshTokenException_whenTokenDoesNotExist() {
        assertThrows(InvalidRefreshTokenException.class, () -> refreshTokenService.rotate("does-not-exist"));
    }

    @Test
    void rotate_shouldThrowInvalidRefreshTokenException_whenTokenIsExpired() {
        // Given
        String raw = "expired-token";
        persistToken(
                "user-expired",
                raw,
                FIXED_NOW.minusSeconds(1), // expired before now
                false,
                null,
                FIXED_NOW.minusSeconds(60));

        // Then
        assertThrows(InvalidRefreshTokenException.class, () -> refreshTokenService.rotate(raw));
    }

    @Test
    void rotate_shouldThrowInvalidRefreshTokenException_whenTokenIsRevokedWithoutReplacement() {
        // Given
        String raw = "revoked-token";
        persistToken(
                "user-revoked",
                raw,
                expectedExpiresAt(FIXED_NOW), // not expired
                true, // revoked
                null, // no replacedBy => not replay, just revoked
                FIXED_NOW.minusSeconds(60));

        // Then
        assertThrows(InvalidRefreshTokenException.class, () -> refreshTokenService.rotate(raw));
    }

    @Test
    void revoke_shouldBeIdempotent_andMarkTokenRevoked() {
        // Given
        IssuedRefreshToken issued = refreshTokenService.issueForUser("user-logout");

        // When: first revoke
        refreshTokenService.revoke(issued.rawToken());

        // Then
        RefreshToken doc = requireToken(issued.tokenHash(), "revoked");
        assertTrue(doc.isRevoked());
        assertNull(doc.getReplacedByTokenHash());

        // When: second revoke (idempotent)
        assertDoesNotThrow(() -> refreshTokenService.revoke(issued.rawToken()));

        // Then: still revoked, still no replacement link
        RefreshToken docAfter = requireToken(issued.tokenHash(), "revoked-after-second");
        assertTrue(docAfter.isRevoked());
        assertNull(docAfter.getReplacedByTokenHash());
    }

    // -----------------------------
    // Helpers (scenario readability)
    // -----------------------------

    private RefreshToken persistToken(
            String userId,
            String rawToken,
            Instant expiresAt,
            boolean revoked,
            String replacedByHash,
            Instant createdAt) {
        String hash = tokenHashService.sha256(rawToken);

        RefreshToken doc = new RefreshToken(userId, hash, expiresAt, revoked, replacedByHash, createdAt);

        return refreshTokenRepository.save(doc);
    }

    private RefreshToken requireToken(String tokenHash, String label) {
        return refreshTokenRepository
                .findByTokenHash(tokenHash)
                .orElseThrow(() -> new AssertionError(label + " token missing"));
    }

    private static void assertActiveToken(RefreshToken doc, String userId) {
        assertFalse(doc.isRevoked());
        assertNull(doc.getReplacedByTokenHash());
        assertEquals(userId, doc.getUserId());
    }

    private static void assertRevokedToken(RefreshToken doc, String userId, String replacedByHash) {
        assertTrue(doc.isRevoked());
        assertEquals(replacedByHash, doc.getReplacedByTokenHash());
        assertEquals(userId, doc.getUserId());
    }

    private static void assertTimestamps(RefreshToken doc, Instant now) {
        assertEquals(now, doc.getCreatedAt());
        assertEquals(expectedExpiresAt(now), doc.getExpiresAt());
    }

    private static Instant expectedExpiresAt(Instant now) {
        return now.plusSeconds(REFRESH_TTL_DAYS * 24L * 60L * 60L);
    }

    @TestConfiguration
    static class FixedClockConfig {
        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(FIXED_NOW, ZoneOffset.UTC);
        }
    }
}
