package com.mealflow.identity.admin.config;

import java.util.Collections;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bound to {@code admin.api.*} in application.properties.
 *
 * <p>The admin API is the entry point used by the cross-app admin panel
 * (admin-all-apps). It is OFF unless {@link #token()} is set to a long random
 * string — see {@link com.mealflow.identity.admin.web.AdminTokenAuthFilter}
 * for the kill-switch.
 */
@ConfigurationProperties(prefix = "admin.api")
public record AdminApiProperties(String token, List<String> allowedIps) {

    public AdminApiProperties {
        if (allowedIps == null) allowedIps = Collections.emptyList();
    }
}
