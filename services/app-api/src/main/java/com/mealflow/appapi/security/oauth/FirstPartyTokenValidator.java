package com.mealflow.appapi.security.oauth;

import java.util.List;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Keeps third-party (OAuth client) access tokens out of the first-party {@code /api/**} surface.
 * First-party app tokens carry neither {@code aud} nor {@code client_id}; a token with the
 * integrations audience or any {@code client_id} is rejected so a Personal OS token can never use
 * the full API.
 */
public class FirstPartyTokenValidator implements OAuth2TokenValidator<Jwt> {

    private static final OAuth2Error NOT_FIRST_PARTY =
            new OAuth2Error(OAuth2ErrorCodes.INVALID_TOKEN, "Token is not valid for this API", null);

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        List<String> audience = jwt.getAudience();
        if (audience != null && audience.contains(IntegrationTokenClaims.AUDIENCE)) {
            return OAuth2TokenValidatorResult.failure(NOT_FIRST_PARTY);
        }
        if (jwt.hasClaim(IntegrationTokenClaims.CLIENT_ID)) {
            return OAuth2TokenValidatorResult.failure(NOT_FIRST_PARTY);
        }
        return OAuth2TokenValidatorResult.success();
    }
}
