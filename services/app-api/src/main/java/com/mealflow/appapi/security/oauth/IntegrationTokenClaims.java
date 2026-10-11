package com.mealflow.appapi.security.oauth;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

/** Claim names and accessors for OAuth access tokens issued to integration clients. */
public record IntegrationTokenClaims(String userId, String clientId, String grantId) {

    public static final String AUDIENCE = "mealflow-integrations";
    public static final String CLIENT_ID = "client_id";
    public static final String GRANT_ID = "gid";

    public static IntegrationTokenClaims from(Jwt jwt) {
        return new IntegrationTokenClaims(
                jwt.getSubject(), jwt.getClaimAsString(CLIENT_ID), jwt.getClaimAsString(GRANT_ID));
    }

    public static IntegrationTokenClaims from(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
            throw new IllegalStateException("No JWT principal available");
        }
        return from(jwt);
    }
}
