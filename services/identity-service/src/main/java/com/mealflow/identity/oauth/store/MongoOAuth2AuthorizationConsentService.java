package com.mealflow.identity.oauth.store;

import com.mealflow.identity.audit.domain.AuditEventType;
import com.mealflow.identity.audit.service.AuditService;
import java.time.Clock;
import java.util.LinkedHashSet;
import java.util.Map;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationConsent;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationConsentService;
import org.springframework.stereotype.Service;

/** Mongo-backed consent store; writes an {@code oauth.consent_granted} audit event on approval. */
@Service
public class MongoOAuth2AuthorizationConsentService implements OAuth2AuthorizationConsentService {

    private final MongoTemplate mongo;
    private final AuditService auditService;
    private final Clock clock;

    public MongoOAuth2AuthorizationConsentService(MongoTemplate mongo, AuditService auditService, Clock clock) {
        this.mongo = mongo;
        this.auditService = auditService;
        this.clock = clock;
    }

    @Override
    public void save(OAuth2AuthorizationConsent consent) {
        OAuthConsentDocument doc = new OAuthConsentDocument();
        doc.id = OAuthConsentDocument.idOf(consent.getRegisteredClientId(), consent.getPrincipalName());
        doc.registeredClientId = consent.getRegisteredClientId();
        doc.principalName = consent.getPrincipalName();
        doc.authorities = new LinkedHashSet<>();
        for (GrantedAuthority a : consent.getAuthorities()) {
            doc.authorities.add(a.getAuthority());
        }
        doc.updatedAt = clock.instant();
        mongo.save(doc);
        auditService.log(
                AuditEventType.OAUTH_CONSENT_GRANTED,
                AuditEventType.OUTCOME_SUCCESS,
                consent.getPrincipalName(),
                "oauth_client",
                consent.getRegisteredClientId(),
                MongoOAuth2AuthorizationService.currentRequest(),
                Map.of("scopes", String.join(" ", consent.getScopes())));
    }

    @Override
    public void remove(OAuth2AuthorizationConsent consent) {
        mongo.remove(
                Query.query(Criteria.where("_id")
                        .is(OAuthConsentDocument.idOf(consent.getRegisteredClientId(), consent.getPrincipalName()))),
                OAuthConsentDocument.class);
    }

    @Override
    public OAuth2AuthorizationConsent findById(String registeredClientId, String principalName) {
        OAuthConsentDocument doc = mongo.findById(
                OAuthConsentDocument.idOf(registeredClientId, principalName), OAuthConsentDocument.class);
        if (doc == null || doc.authorities == null || doc.authorities.isEmpty()) {
            return null;
        }
        OAuth2AuthorizationConsent.Builder b = OAuth2AuthorizationConsent.withId(registeredClientId, principalName);
        doc.authorities.forEach(a -> b.authority(new SimpleGrantedAuthority(a)));
        return b.build();
    }

    public long removeAll(String principalName, String registeredClientId) {
        Criteria c = Criteria.where("principalName").is(principalName);
        if (registeredClientId != null) {
            c = c.and("registeredClientId").is(registeredClientId);
        }
        return mongo.remove(Query.query(c), OAuthConsentDocument.class).getDeletedCount();
    }
}
