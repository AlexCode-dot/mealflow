package com.mealflow.identity.oauth.config;

import java.util.Map;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;

/**
 * Read-only registry of clients built from configuration. Unlike {@code
 * InMemoryRegisteredClientRepository} it may be empty (no client configured = OAuth disabled).
 */
public class ConfiguredClientRepository implements RegisteredClientRepository {

    private final Map<String, RegisteredClient> byId;
    private final Map<String, RegisteredClient> byClientId;

    public ConfiguredClientRepository(Map<String, RegisteredClient> byId, Map<String, RegisteredClient> byClientId) {
        this.byId = Map.copyOf(byId);
        this.byClientId = Map.copyOf(byClientId);
    }

    @Override
    public void save(RegisteredClient registeredClient) {
        throw new UnsupportedOperationException("Clients are configured, not registered at runtime");
    }

    @Override
    public RegisteredClient findById(String id) {
        return byId.get(id);
    }

    @Override
    public RegisteredClient findByClientId(String clientId) {
        return byClientId.get(clientId);
    }
}
