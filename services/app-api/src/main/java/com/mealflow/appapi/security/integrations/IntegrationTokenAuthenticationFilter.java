package com.mealflow.appapi.security.integrations;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

/**
 * Recognises {@code Authorization: Bearer mfi_*} tokens and authenticates the request as the
 * issuing user. Other Authorization headers are passed through to the JWT filter unchanged.
 *
 * <p>Sets the request attribute {@code integration_token=true} so downstream filters / handlers can
 * tell an integration token apart from a regular JWT.
 *
 * <p>Scope enforcement: integration tokens are restricted to specific URL areas. The mapping below
 * is the authoritative policy. Tokens with no matching scope for the request get 403; tokens hitting
 * an unmapped path get 403. Regular user JWTs are not affected by this filter.
 */
@Component
public class IntegrationTokenAuthenticationFilter extends OncePerRequestFilter {

    public static final String TOKEN_PREFIX = "mfi_";
    public static final String REQUEST_ATTR = "integration_token";

    /**
     * Maps URL prefix → scope area. A request to a path beginning with the prefix requires
     * either {@code <area>:read} (for GET) or {@code <area>:write} (for any other method).
     */
    private static final Map<String, String> AREA_BY_PREFIX = Map.of("/api/recipes", "recipes");

    private final IntegrationTokenAuthService authService;
    private final ObjectMapper objectMapper;

    public IntegrationTokenAuthenticationFilter(IntegrationTokenAuthService authService, ObjectMapper objectMapper) {
        this.authService = authService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            chain.doFilter(request, response);
            return;
        }

        String raw = header.substring(7).trim();
        if (!raw.startsWith(TOKEN_PREFIX)) {
            chain.doFilter(request, response);
            return;
        }

        Optional<IntegrationTokenAuthService.Resolved> resolved = authService.resolve(raw);
        if (resolved.isEmpty()) {
            writeProblem(request, response, HttpStatus.UNAUTHORIZED, "Invalid integration token");
            return;
        }

        IntegrationTokenAuthService.Resolved r = resolved.get();

        String scopeError = checkScope(request, r.scopes());
        if (scopeError != null) {
            writeProblem(request, response, HttpStatus.FORBIDDEN, scopeError);
            return;
        }

        AbstractAuthenticationToken auth = buildAuthentication(r);
        SecurityContextHolder.getContext().setAuthentication(auth);
        request.setAttribute(REQUEST_ATTR, Boolean.TRUE);

        try {
            authService.recordLastUsed(r.tokenHash());
        } catch (RuntimeException ignored) {
            // Best-effort; don't fail the request if the bookkeeping write fails.
        }

        // Hide the Authorization header from the downstream BearerTokenAuthenticationFilter so it
        // doesn't try to JWT-decode the opaque mfi_* value and fail the request.
        chain.doFilter(stripAuthHeader(request), response);
    }

    /**
     * Returns null when access is allowed, or a user-readable reason string when it must be denied.
     */
    private static String checkScope(HttpServletRequest request, List<String> tokenScopes) {
        String path = request.getRequestURI();
        String area = areaForPath(path);
        if (area == null) {
            return "Integration tokens cannot access this endpoint";
        }
        boolean isRead = "GET".equalsIgnoreCase(request.getMethod()) || "HEAD".equalsIgnoreCase(request.getMethod());
        String required = area + (isRead ? ":read" : ":write");
        if (tokenScopes == null || !tokenScopes.contains(required)) {
            return "Token missing required scope: " + required;
        }
        return null;
    }

    private static String areaForPath(String path) {
        if (path == null) return null;
        for (Map.Entry<String, String> e : AREA_BY_PREFIX.entrySet()) {
            String prefix = e.getKey();
            if (path.equals(prefix) || path.startsWith(prefix + "/")) {
                return e.getValue();
            }
        }
        return null;
    }

    private static HttpServletRequest stripAuthHeader(HttpServletRequest delegate) {
        return new HttpServletRequestWrapper(delegate) {
            @Override
            public String getHeader(String name) {
                if (HttpHeaders.AUTHORIZATION.equalsIgnoreCase(name)) {
                    return null;
                }
                return super.getHeader(name);
            }

            @Override
            public Enumeration<String> getHeaders(String name) {
                if (HttpHeaders.AUTHORIZATION.equalsIgnoreCase(name)) {
                    return Collections.emptyEnumeration();
                }
                return super.getHeaders(name);
            }
        };
    }

    private AbstractAuthenticationToken buildAuthentication(IntegrationTokenAuthService.Resolved r) {
        Instant now = Instant.now();
        Jwt synthetic = Jwt.withTokenValue("mfi-" + r.tokenId())
                .header("alg", "none")
                .subject(r.userId())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(60))
                .claim("token_type", "integration")
                .claim("integration_token_id", r.tokenId())
                .claim("scopes", r.scopes())
                .build();
        return new JwtAuthenticationToken(synthetic, List.of());
    }

    private void writeProblem(
            HttpServletRequest request, HttpServletResponse response, HttpStatus status, String detail)
            throws IOException {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setTitle(status.getReasonPhrase());
        pd.setProperty("path", request.getRequestURI());
        pd.setProperty("timestamp", Instant.now().toString());

        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), pd);
    }
}
