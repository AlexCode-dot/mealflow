package com.mealflow.identity.token.service;

import com.mealflow.identity.security.config.TokenProperties;
import com.mealflow.identity.token.domain.RefreshToken;
import com.mealflow.identity.token.error.InvalidRefreshTokenException;
import com.mealflow.identity.token.error.RefreshTokenReplayException;
import com.mealflow.identity.token.repository.RefreshTokenRepository;
import java.time.Clock;
import java.time.Instant;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final RefreshTokenGenerator refreshTokenGenerator;
    private final TokenHashService tokenHashService;
    private final TokenProperties tokenProperties;
    private final Clock clock;
    private final MongoTemplate mongoTemplate;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            RefreshTokenGenerator refreshTokenGenerator,
            TokenHashService tokenHashService,
            TokenProperties tokenProperties,
            Clock clock,
            MongoTemplate mongoTemplate) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenGenerator = refreshTokenGenerator;
        this.tokenHashService = tokenHashService;
        this.tokenProperties = tokenProperties;
        this.clock = clock;
        this.mongoTemplate = mongoTemplate;
    }

    public IssuedRefreshToken issueForUser(String userId) {
        Instant now = clock.instant();

        String rawToken = refreshTokenGenerator.generate();
        String tokenHash = tokenHashService.sha256(rawToken);

        Instant expiresAt = now.plusSeconds(tokenProperties.refreshTokenTtlDays() * 24L * 60L * 60L);

        RefreshToken doc = new RefreshToken(userId, tokenHash, expiresAt, false, null, now);
        refreshTokenRepository.save(doc);

        return new IssuedRefreshToken(userId, rawToken, tokenHash, expiresAt);
    }

    /**
     * Rotates a refresh token atomically.
     *
     * Guarantees single-use rotation even under concurrent requests:
     * - only one request can flip revoked=false -> true for the old token
     * - others will observe revoked/replacedBy and be treated as replay
     */
    @Transactional
    public IssuedRefreshToken rotate(String rawToken) {
        Instant now = clock.instant();
        String oldTokenHash = tokenHashService.sha256(rawToken);

        String newRawToken = refreshTokenGenerator.generate();
        String newTokenHash = tokenHashService.sha256(newRawToken);
        Instant newExpiresAt = now.plusSeconds(tokenProperties.refreshTokenTtlDays() * 24L * 60L * 60L);

        Query q = new Query(new Criteria()
                .andOperator(
                        Criteria.where("tokenHash").is(oldTokenHash),
                        Criteria.where("revoked").is(false),
                        Criteria.where("expiresAt").gt(now)));

        Update u = new Update().set("revoked", true).set("replacedByTokenHash", newTokenHash);

        RefreshToken previous =
                mongoTemplate.findAndModify(q, u, FindAndModifyOptions.options().returnNew(false), RefreshToken.class);

        if (previous == null) {
            RefreshToken existing = refreshTokenRepository
                    .findByTokenHash(oldTokenHash)
                    .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token is invalid"));

            if (existing.isExpired(now)) {
                throw new InvalidRefreshTokenException("Refresh token has expired");
            }

            if (existing.isRevoked()) {
                if (existing.getReplacedByTokenHash() != null) {
                    throw new RefreshTokenReplayException("Refresh token replay detected");
                }
                throw new InvalidRefreshTokenException("Refresh token is revoked");
            }

            throw new InvalidRefreshTokenException("Refresh token is invalid");
        }

        RefreshToken replacement = new RefreshToken(previous.getUserId(), newTokenHash, newExpiresAt, false, null, now);

        refreshTokenRepository.save(replacement);

        return new IssuedRefreshToken(previous.getUserId(), newRawToken, newTokenHash, newExpiresAt);
    }

    /**
     * Idempotent logout: marks refresh token as revoked (atomic).
     * - If token doesn't exist: no-op
     * - If already revoked: no-op
     */
    public void revoke(String rawToken) {
        String tokenHash = tokenHashService.sha256(rawToken);

        Query q = new Query(new Criteria()
                .andOperator(
                        Criteria.where("tokenHash").is(tokenHash),
                        Criteria.where("revoked").is(false)));

        Update u = new Update().set("revoked", true).set("replacedByTokenHash", null);

        mongoTemplate.findAndModify(q, u, FindAndModifyOptions.options().returnNew(false), RefreshToken.class);
    }
}
