package com.mealflow.identity.oauth.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Third-party OAuth client registration for Personal OS (MF1). The client is only registered
 * when both {@code clientId} and {@code clientSecret} are set — secrets come from the environment,
 * never from committed config.
 */
@ConfigurationProperties(prefix = "app.oauth.personal-os")
public record OAuthClientProperties(
        String clientId,
        String clientSecret,
        List<String> redirectUris,
        int accessTokenTtlMinutes,
        int refreshTokenTtlDays,
        int authorizationCodeTtlMinutes) {

    public boolean isConfigured() {
        return clientId != null
                && !clientId.isBlank()
                && clientSecret != null
                && !clientSecret.isBlank()
                && redirectUris != null
                && !redirectUris.isEmpty();
    }
}
