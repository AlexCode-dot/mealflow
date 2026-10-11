package com.mealflow.identity.oauth.service;

import com.mealflow.identity.oauth.store.MongoOAuth2AuthorizationConsentService;
import com.mealflow.identity.oauth.store.MongoOAuth2AuthorizationService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.stereotype.Service;

@Service
public class ConnectionsService {

    private final MongoOAuth2AuthorizationService authorizations;
    private final MongoOAuth2AuthorizationConsentService consents;
    private final RegisteredClientRepository clients;

    public ConnectionsService(
            MongoOAuth2AuthorizationService authorizations,
            MongoOAuth2AuthorizationConsentService consents,
            RegisteredClientRepository clients) {
        this.authorizations = authorizations;
        this.consents = consents;
        this.clients = clients;
    }

    /** Active connections (grants that reached a token and aren't revoked), one per client. */
    public List<Connection> list(String userId) {
        Map<String, Connection> byClient = new LinkedHashMap<>();
        authorizations.findGrants(userId).stream()
                .filter(g -> g.accessTokenHash != null && !g.revoked)
                .sorted(Comparator.comparing(g -> g.createdAt))
                .forEach(g -> {
                    RegisteredClient client = clients.findById(g.registeredClientId);
                    if (client == null) {
                        return;
                    }
                    Connection existing = byClient.get(client.getClientId());
                    Set<String> scopes = new LinkedHashSet<>(g.authorizedScopes);
                    if (existing != null) {
                        scopes.addAll(existing.scopes());
                    }
                    Instant connectedAt = existing != null ? existing.connectedAt() : g.createdAt;
                    byClient.put(
                            client.getClientId(),
                            new Connection(
                                    client.getClientId(),
                                    client.getClientName(),
                                    new ArrayList<>(scopes),
                                    connectedAt,
                                    g.updatedAt));
                });
        return new ArrayList<>(byClient.values());
    }

    /** @return false when the client is unknown. */
    public boolean revoke(String userId, String clientId) {
        RegisteredClient client = clients.findByClientId(clientId);
        if (client == null) {
            return false;
        }
        authorizations.removeGrants(userId, client.getId());
        consents.removeAll(userId, client.getId());
        return true;
    }

    /** Account deletion: drop every grant and consent of the user. */
    public void removeAll(String userId) {
        authorizations.removeGrants(userId, null);
        consents.removeAll(userId, null);
    }

    public record Connection(
            String clientId, String name, List<String> scopes, Instant connectedAt, Instant lastActiveAt) {}
}
