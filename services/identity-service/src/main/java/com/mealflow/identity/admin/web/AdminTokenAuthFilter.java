package com.mealflow.identity.admin.web;

import com.mealflow.identity.admin.config.AdminApiProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

/**
 * Authenticates {@code /api/admin/**} requests by Bearer token and (optionally)
 * source IP.
 *
 * <p>Mirrors {@code apps/api/src/lib/admin-auth.ts} on the sam-app side: same
 * two checks, same response envelope, same deliberate vagueness on failure so
 * a probing attacker can't fingerprint the token format.
 *
 * <h3>Why a separate filter (not OAuth2)</h3>
 * The admin panel uses a long-lived shared secret stored encrypted in the
 * admin DB, NOT a JWT. We want the admin path to bypass the OAuth2 JWT chain
 * entirely and short-circuit on bearer compare. Putting this in the same
 * filter chain as user JWT validation would risk an end-user JWT being
 * accepted in an admin context if the path matchers ever drift.
 */
public class AdminTokenAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AdminTokenAuthFilter.class);
    private static final Pattern BEARER = Pattern.compile("^Bearer\\s+([A-Za-z0-9_\\-=]+)$");

    /** Authorities granted to a valid admin caller. Used by method-security if we add it later. */
    public static final String ROLE_ADMIN = "ROLE_ADMIN";

    private final AdminApiProperties properties;
    private final ObjectMapper objectMapper;

    public AdminTokenAuthFilter(AdminApiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Only run for the admin namespace. Everything else goes straight to the
        // regular JWT chain.
        return !request.getRequestURI().startsWith("/api/admin");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        // 1. Kill switch — refuse all admin traffic unless the token is configured
        //    to something that looks plausibly random. Better to 503 than to
        //    silently default-allow.
        String configured = properties.token();
        if (configured == null || configured.length() < 32) {
            log.warn("admin: rejected, ADMIN_API_TOKEN not configured");
            writeProblem(response, 503, "ADMIN_DISABLED", "Admin API not configured");
            return;
        }

        // 2. IP allowlist — empty list means "no restriction" (dev/test). In prod
        //    we always set this to the admin-panel egress IP.
        List<String> allowedIps = properties.allowedIps();
        if (!allowedIps.isEmpty()) {
            String ip = request.getRemoteAddr();
            if (!allowedIps.contains(ip)) {
                log.warn("admin: ip not allowed ip={}", ip);
                writeProblem(response, 403, "FORBIDDEN", "Forbidden");
                return;
            }
        }

        // 3. Bearer compare — constant-time to avoid leaking prefix-match info.
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        String provided = extractBearer(header);
        if (provided == null || !constantTimeEquals(provided, configured)) {
            log.warn("admin: bearer mismatch ip={}", request.getRemoteAddr());
            writeProblem(response, 401, "UNAUTHORIZED", "Unauthorized");
            return;
        }

        // 4. Populate a minimal Authentication so downstream code (controllers,
        //    audit logger) can pull principal=ADMIN from SecurityContextHolder.
        AbstractAuthenticationToken auth = new PreAuthenticatedAuthenticationToken(
                "admin-api", null, java.util.List.of(new SimpleAdminAuthority()));
        auth.setAuthenticated(true);
        SecurityContextHolder.getContext().setAuthentication(auth);

        try {
            chain.doFilter(request, response);
        } finally {
            // Don't leak admin auth into any thread that the servlet container
            // pools after we return.
            SecurityContextHolder.clearContext();
        }
    }

    private static String extractBearer(String header) {
        if (header == null) return null;
        Matcher m = BEARER.matcher(header);
        return m.matches() ? m.group(1) : null;
    }

    private static boolean constantTimeEquals(String a, String b) {
        byte[] aa = a.getBytes(StandardCharsets.UTF_8);
        byte[] bb = b.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(aa, bb);
    }

    private void writeProblem(HttpServletResponse response, int status, String code, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", code);
        body.put("message", message);
        objectMapper.writeValue(response.getOutputStream(), body);
    }

    /**
     * Tiny inner class instead of pulling in {@code SimpleGrantedAuthority} so we
     * don't accidentally collide with end-user authorities granted by the JWT
     * chain. The string still matches Spring's convention so {@code hasRole("ADMIN")}
     * works if we later add method-security.
     */
    private static final class SimpleAdminAuthority implements org.springframework.security.core.GrantedAuthority {
        @Override
        public String getAuthority() {
            return ROLE_ADMIN;
        }
    }
}
