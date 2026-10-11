package com.mealflow.identity.oauth.store;

import com.mealflow.identity.audit.domain.AuditEventType;
import com.mealflow.identity.audit.service.AuditService;
import com.mealflow.identity.oauth.service.OAuthLoginAuthenticationProvider;
import com.mealflow.identity.oauth.store.OAuthAuthorizationDocument.TokenRecord;
import com.mealflow.identity.token.service.TokenHashService;
import jakarta.servlet.http.HttpServletRequest;
import java.security.Principal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.security.oauth2.core.OAuth2Token;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationCode;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Mongo-backed {@link OAuth2AuthorizationService}: storage only — all protocol decisions stay in
 * Spring Authorization Server.
 *
 * <p>Token values are never persisted. Each token is stored as a SHA-256 hash; when an
 * authorization is loaded by token, the presented raw value is put back on the matching token so
 * the library can work with it, the other tokens carry a {@code h:}-prefixed hash placeholder.
 *
 * <p><b>Refresh-token reuse detection:</b> refresh tokens rotate on every use ({@code
 * reuseRefreshTokens=false}); the hash of each rotated-out token is kept. Presenting a retired
 * refresh token again means it leaked — the whole grant (token family) is deleted, so both the
 * attacker's and the legitimate client's tokens stop working, and a {@code
 * security.token_reuse_detected} audit event is written.
 */
@Service
public class MongoOAuth2AuthorizationService implements OAuth2AuthorizationService {

    static final String HASH_PREFIX = "h:";
    private static final String PRINCIPAL_ATTR = Principal.class.getName();
    private static final String REQUEST_ATTR = OAuth2AuthorizationRequest.class.getName();

    private final MongoTemplate mongo;
    private final RegisteredClientRepository clients;
    private final TokenHashService hashes;
    private final AuditService auditService;
    private final Clock clock;

    public MongoOAuth2AuthorizationService(
            MongoTemplate mongo,
            RegisteredClientRepository clients,
            TokenHashService hashes,
            AuditService auditService,
            Clock clock) {
        this.mongo = mongo;
        this.clients = clients;
        this.hashes = hashes;
        this.auditService = auditService;
        this.clock = clock;
    }

    @Override
    public void save(OAuth2Authorization authorization) {
        OAuthAuthorizationDocument previous = mongo.findById(authorization.getId(), OAuthAuthorizationDocument.class);
        OAuthAuthorizationDocument doc = toDocument(authorization, previous);
        mongo.save(doc);
        auditTransitions(previous, doc);
    }

    @Override
    public void remove(OAuth2Authorization authorization) {
        mongo.remove(Query.query(Criteria.where("_id").is(authorization.getId())), OAuthAuthorizationDocument.class);
    }

    @Override
    public OAuth2Authorization findById(String id) {
        OAuthAuthorizationDocument doc = mongo.findById(id, OAuthAuthorizationDocument.class);
        return doc == null ? null : toAuthorization(doc, null, null);
    }

    @Override
    public OAuth2Authorization findByToken(String token, OAuth2TokenType tokenType) {
        if (token == null || token.isBlank()) {
            return null;
        }
        String hash = hashes.sha256(token);
        String type = tokenType == null ? null : tokenType.getValue();

        Criteria criteria;
        if (type == null) {
            criteria = new Criteria()
                    .orOperator(
                            Criteria.where("state").is(token),
                            Criteria.where("authorizationCodeHash").is(hash),
                            Criteria.where("accessTokenHash").is(hash),
                            Criteria.where("refreshTokenHash").is(hash));
        } else if (OAuth2ParameterNames.STATE.equals(type)) {
            criteria = Criteria.where("state").is(token);
        } else if (OAuth2ParameterNames.CODE.equals(type)) {
            criteria = Criteria.where("authorizationCodeHash").is(hash);
        } else if (OAuth2TokenType.ACCESS_TOKEN.equals(tokenType)) {
            criteria = Criteria.where("accessTokenHash").is(hash);
        } else if (OAuth2TokenType.REFRESH_TOKEN.equals(tokenType)) {
            criteria = Criteria.where("refreshTokenHash").is(hash);
        } else {
            return null;
        }

        OAuthAuthorizationDocument doc = mongo.findOne(Query.query(criteria), OAuthAuthorizationDocument.class);
        if (doc != null) {
            return toAuthorization(doc, token, hash);
        }
        if (type == null || OAuth2TokenType.REFRESH_TOKEN.equals(tokenType)) {
            revokeFamilyOnReuse(hash);
        }
        return null;
    }

    /** All grants of one user for one client — used by the account "connections" API. */
    public List<OAuthAuthorizationDocument> findGrants(String userId) {
        return mongo.find(Query.query(Criteria.where("principalName").is(userId)), OAuthAuthorizationDocument.class);
    }

    public long removeGrants(String userId, String registeredClientId) {
        Criteria c = Criteria.where("principalName").is(userId);
        if (registeredClientId != null) {
            c = c.and("registeredClientId").is(registeredClientId);
        }
        return mongo.remove(Query.query(c), OAuthAuthorizationDocument.class).getDeletedCount();
    }

    private void revokeFamilyOnReuse(String hash) {
        OAuthAuthorizationDocument family = mongo.findOne(
                Query.query(Criteria.where("retiredRefreshTokenHashes").is(hash)), OAuthAuthorizationDocument.class);
        if (family == null) {
            return;
        }
        mongo.remove(Query.query(Criteria.where("_id").is(family.id)), OAuthAuthorizationDocument.class);
        auditService.log(
                AuditEventType.TOKEN_REUSE_DETECTED,
                null,
                family.principalName,
                "oauth_grant",
                family.id,
                currentRequest(),
                Map.of("channel", "oauth", "client", String.valueOf(family.registeredClientId)));
    }

    private OAuthAuthorizationDocument toDocument(OAuth2Authorization a, OAuthAuthorizationDocument previous) {
        OAuthAuthorizationDocument doc = new OAuthAuthorizationDocument();
        Instant now = clock.instant();
        doc.id = a.getId();
        doc.registeredClientId = a.getRegisteredClientId();
        doc.principalName = a.getPrincipalName();
        doc.authorizationGrantType = a.getAuthorizationGrantType().getValue();
        doc.authorizedScopes = new LinkedHashSet<>(a.getAuthorizedScopes());
        doc.state = a.getAttribute(OAuth2ParameterNames.STATE);
        doc.createdAt = previous != null && previous.createdAt != null ? previous.createdAt : now;
        doc.updatedAt = now;

        OAuth2AuthorizationRequest request = a.getAttribute(REQUEST_ATTR);
        if (request != null) {
            doc.requestAuthorizationUri = request.getAuthorizationUri();
            doc.requestClientId = request.getClientId();
            doc.requestRedirectUri = request.getRedirectUri();
            doc.requestScopes = new LinkedHashSet<>(request.getScopes());
            doc.requestState = request.getState();
            Map<String, Object> params = new HashMap<>();
            request.getAdditionalParameters().forEach((k, v) -> {
                if (v instanceof String s) params.put(k, s);
            });
            doc.requestAdditionalParameters = params;
        }

        doc.authorizationCode = record(a.getToken(OAuth2AuthorizationCode.class));
        doc.accessToken = record(a.getToken(OAuth2AccessToken.class));
        doc.refreshToken = record(a.getToken(OAuth2RefreshToken.class));
        doc.authorizationCodeHash = doc.authorizationCode == null ? null : doc.authorizationCode.hash;
        doc.accessTokenHash = doc.accessToken == null ? null : doc.accessToken.hash;
        doc.refreshTokenHash = doc.refreshToken == null ? null : doc.refreshToken.hash;

        List<String> retired = new ArrayList<>();
        if (previous != null && previous.retiredRefreshTokenHashes != null) {
            retired.addAll(previous.retiredRefreshTokenHashes);
        }
        if (previous != null
                && previous.refreshTokenHash != null
                && !previous.refreshTokenHash.equals(doc.refreshTokenHash)) {
            retired.add(previous.refreshTokenHash);
        }
        doc.retiredRefreshTokenHashes = retired;

        doc.revoked = (doc.accessToken != null && doc.accessToken.invalidated)
                || (doc.refreshToken != null && doc.refreshToken.invalidated);
        return doc;
    }

    private TokenRecord record(OAuth2Authorization.Token<? extends OAuth2Token> token) {
        if (token == null) {
            return null;
        }
        OAuth2Token t = token.getToken();
        TokenRecord r = new TokenRecord();
        r.hash = hashOf(t.getTokenValue());
        r.issuedAt = t.getIssuedAt();
        r.expiresAt = t.getExpiresAt();
        r.invalidated = token.isInvalidated();
        if (t instanceof OAuth2AccessToken at) {
            r.scopes = new LinkedHashSet<>(at.getScopes());
        }
        return r;
    }

    private String hashOf(String value) {
        return value.startsWith(HASH_PREFIX) ? value.substring(HASH_PREFIX.length()) : hashes.sha256(value);
    }

    private OAuth2Authorization toAuthorization(OAuthAuthorizationDocument doc, String rawToken, String rawHash) {
        RegisteredClient client = clients.findById(doc.registeredClientId);
        if (client == null) {
            // Client no longer configured: its grants are unusable.
            return null;
        }
        OAuth2Authorization.Builder b = OAuth2Authorization.withRegisteredClient(client)
                .id(doc.id)
                .principalName(doc.principalName)
                .authorizationGrantType(new AuthorizationGrantType(doc.authorizationGrantType))
                .authorizedScopes(doc.authorizedScopes == null ? Set.of() : doc.authorizedScopes)
                .attribute(PRINCIPAL_ATTR, OAuthLoginAuthenticationProvider.authenticated(doc.principalName));
        if (doc.state != null) {
            b.attribute(OAuth2ParameterNames.STATE, doc.state);
        }
        if (doc.requestClientId != null) {
            b.attribute(
                    REQUEST_ATTR,
                    OAuth2AuthorizationRequest.authorizationCode()
                            .authorizationUri(doc.requestAuthorizationUri)
                            .clientId(doc.requestClientId)
                            .redirectUri(doc.requestRedirectUri)
                            .scopes(doc.requestScopes == null ? Set.of() : doc.requestScopes)
                            .state(doc.requestState)
                            .additionalParameters(
                                    doc.requestAdditionalParameters == null
                                            ? Map.of()
                                            : doc.requestAdditionalParameters)
                            .build());
        }
        if (doc.authorizationCode != null) {
            TokenRecord r = doc.authorizationCode;
            b.token(
                    new OAuth2AuthorizationCode(valueFor(r, rawToken, rawHash), r.issuedAt, r.expiresAt),
                    md -> md.put(OAuth2Authorization.Token.INVALIDATED_METADATA_NAME, r.invalidated));
        }
        if (doc.accessToken != null) {
            TokenRecord r = doc.accessToken;
            b.token(
                    new OAuth2AccessToken(
                            OAuth2AccessToken.TokenType.BEARER,
                            valueFor(r, rawToken, rawHash),
                            r.issuedAt,
                            r.expiresAt,
                            r.scopes == null ? Set.of() : r.scopes),
                    md -> md.put(OAuth2Authorization.Token.INVALIDATED_METADATA_NAME, r.invalidated));
        }
        if (doc.refreshToken != null) {
            TokenRecord r = doc.refreshToken;
            b.token(
                    new OAuth2RefreshToken(valueFor(r, rawToken, rawHash), r.issuedAt, r.expiresAt),
                    md -> md.put(OAuth2Authorization.Token.INVALIDATED_METADATA_NAME, r.invalidated));
        }
        return b.build();
    }

    private static String valueFor(TokenRecord r, String rawToken, String rawHash) {
        return rawHash != null && rawHash.equals(r.hash) ? rawToken : HASH_PREFIX + r.hash;
    }

    private void auditTransitions(OAuthAuthorizationDocument previous, OAuthAuthorizationDocument doc) {
        String previousAccess = previous == null ? null : previous.accessTokenHash;
        if (doc.accessTokenHash != null && !Objects.equals(previousAccess, doc.accessTokenHash)) {
            auditService.log(
                    AuditEventType.OAUTH_TOKEN_ISSUED,
                    AuditEventType.OUTCOME_SUCCESS,
                    doc.principalName,
                    "oauth_grant",
                    doc.id,
                    currentRequest(),
                    Map.of(
                            "client",
                            String.valueOf(doc.registeredClientId),
                            "grantType",
                            previousAccess == null ? "authorization_code" : "refresh_token",
                            "scopes",
                            String.join(" ", doc.authorizedScopes)));
        }
        boolean wasRevoked = previous != null && previous.revoked;
        if (doc.revoked && !wasRevoked) {
            auditService.log(
                    AuditEventType.OAUTH_TOKEN_REVOKED,
                    AuditEventType.OUTCOME_SUCCESS,
                    doc.principalName,
                    "oauth_grant",
                    doc.id,
                    currentRequest(),
                    Map.of("client", String.valueOf(doc.registeredClientId)));
        }
    }

    static HttpServletRequest currentRequest() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            return attrs.getRequest();
        }
        return null;
    }
}
