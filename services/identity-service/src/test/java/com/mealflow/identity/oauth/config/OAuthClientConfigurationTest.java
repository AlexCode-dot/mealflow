package com.mealflow.identity.oauth.config;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;

/**
 * The off switch. GL1b passes {@code PERSONAL_OS_OAUTH_CLIENT_ID|_CLIENT_SECRET|_REDIRECT_URIS} from
 * {@code .env.prod} into identity-service, and docker compose substitutes a missing variable as the
 * empty string — so "not set on the server" reaches Spring as blank, not as null. Empty (in any
 * combination) must register no client at all: /oauth2/authorize then has nothing to authorize and
 * nothing changes for existing MealFlow users.
 */
class OAuthClientConfigurationTest {

    private static final String REDIRECT = "https://personal-os.example/connections/mealflow/callback";

    @Test
    void blankOrPartialConfigurationRegistersNoClient() {
        for (OAuthClientProperties props : List.of(
                props("", "", List.of()), // nothing in .env.prod
                props("", "", null), // redirect-uris absent entirely
                props("  ", "  ", List.of(REDIRECT)), // whitespace is not a value
                props("personal-os", "", List.of(REDIRECT)), // secret still to be generated
                props("", "s3cret", List.of(REDIRECT)), // id forgotten
                props("personal-os", "s3cret", List.of()))) { // redirect URI forgotten
            assertThat(props.isConfigured(), is(false));

            RegisteredClientRepository repo = new AuthorizationServerConfig().registeredClientRepository(props);
            assertThat(repo.findByClientId("personal-os"), nullValue());
            assertThat(repo.findById(OAuthScopes.PERSONAL_OS_REGISTERED_ID), nullValue());
        }
    }

    @Test
    void allThreeSetRegistersThePersonalOsClientWithPkceAndConsent() {
        OAuthClientProperties props = props("personal-os", "s3cret", List.of(REDIRECT));
        assertThat(props.isConfigured(), is(true));

        RegisteredClient client = new AuthorizationServerConfig()
                .registeredClientRepository(props)
                .findByClientId("personal-os");

        assertThat(client, notNullValue());
        assertThat(client.getId(), equalTo(OAuthScopes.PERSONAL_OS_REGISTERED_ID));
        assertThat(client.getRedirectUris(), contains(REDIRECT));
        assertThat(client.getScopes(), containsInAnyOrder(OAuthScopes.ALL.toArray()));
        assertThat(
                client.getAuthorizationGrantTypes(),
                containsInAnyOrder(AuthorizationGrantType.AUTHORIZATION_CODE, AuthorizationGrantType.REFRESH_TOKEN));
        assertThat(client.getClientSettings().isRequireProofKey(), is(true));
        assertThat(client.getClientSettings().isRequireAuthorizationConsent(), is(true));
        // The raw secret never leaves the environment: what is registered is a hash of it.
        assertThat(client.getClientSecret(), not(containsString("s3cret")));
    }

    private static OAuthClientProperties props(String id, String secret, List<String> redirectUris) {
        return new OAuthClientProperties(id, secret, redirectUris, 5, 30, 5);
    }
}
