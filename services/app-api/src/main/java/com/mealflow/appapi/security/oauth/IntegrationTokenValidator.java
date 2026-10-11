package com.mealflow.appapi.security.oauth;

import java.util.List;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Shape checks for integration access tokens: audience must contain {@code
 * mealflow-integrations}, and {@code sub}, {@code client_id} and {@code gid} must be present.
 */
public class IntegrationTokenValidator implements OAuth2TokenValidator<Jwt> {

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        List<String> audience = jwt.getAudience();
        if (audience == null || !audience.contains(IntegrationTokenClaims.AUDIENCE)) {
            return failure("Token audience is not valid for the integration API");
        }
        if (isBlank(jwt.getSubject())
                || isBlank(jwt.getClaimAsString(IntegrationTokenClaims.CLIENT_ID))
                || isBlank(jwt.getClaimAsString(IntegrationTokenClaims.GRANT_ID))) {
            return failure("Token is missing required claims");
        }
        return OAuth2TokenValidatorResult.success();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static OAuth2TokenValidatorResult failure(String description) {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error(OAuth2ErrorCodes.INVALID_TOKEN, description, null));
    }
}
