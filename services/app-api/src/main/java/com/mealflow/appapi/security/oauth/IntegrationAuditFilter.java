package com.mealflow.appapi.security.oauth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * One structured INFO line per integration API request. Logs ids, method, path (no query string)
 * and status only — never token values or request/response bodies.
 *
 * <p>Deliberately not a {@code @Component}: it is only wired into the {@code /integrations/**}
 * security chain, so Spring Boot does not also register it as a global servlet filter.
 */
public class IntegrationAuditFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger("integration_audit");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            chain.doFilter(request, response);
        } finally {
            String userId = "-";
            String clientId = "-";
            String grantId = "-";
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
                IntegrationTokenClaims claims = IntegrationTokenClaims.from(jwt);
                userId = orDash(claims.userId());
                clientId = orDash(claims.clientId());
                grantId = orDash(claims.grantId());
            }
            log.info(
                    "integration_audit userId={} clientId={} gid={} method={} path={} status={}",
                    userId,
                    clientId,
                    grantId,
                    request.getMethod(),
                    request.getRequestURI(),
                    response.getStatus());
        }
    }

    private static String orDash(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}
