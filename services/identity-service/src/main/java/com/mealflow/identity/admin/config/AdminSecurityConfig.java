package com.mealflow.identity.admin.config;

import com.mealflow.identity.admin.web.AdminTokenAuthFilter;
import com.mealflow.identity.security.config.SecurityProblemSupport;
import com.mealflow.identity.web.logging.RequestIdFilter;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Dedicated security chain for {@code /api/admin/**}.
 *
 * <p>Order is {@code @Order(0)} so it runs BEFORE the default OAuth2 chain
 * (which is unordered = LOWEST_PRECEDENCE). That way an admin request never
 * touches the JWT validator — eliminating the risk of an end-user access
 * token being accepted in an admin context if path matchers ever overlap.
 */
@Configuration
@EnableConfigurationProperties(AdminApiProperties.class)
public class AdminSecurityConfig {

    @Bean
    @Order(0)
    SecurityFilterChain adminSecurityFilterChain(
            HttpSecurity http,
            AdminTokenAuthFilter adminTokenAuthFilter,
            SecurityProblemSupport problems,
            RequestIdFilter requestIdFilter)
            throws Exception {
        return http.securityMatcher("/api/admin/**")
                .csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable)
                // Keep request-id so admin logs correlate with the panel's request id.
                .addFilterBefore(requestIdFilter, UsernamePasswordAuthenticationFilter.class)
                // Admin token check fires before any auth in the standard chain.
                .addFilterBefore(adminTokenAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(ex -> ex.authenticationEntryPoint(problems).accessDeniedHandler(problems))
                // The filter already populated the SecurityContext (or short-circuited).
                // We still want Spring to enforce "anyRequest authenticated" so an
                // accidental config slip doesn't expose endpoints.
                .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                .build();
    }

    @Bean
    AdminTokenAuthFilter adminTokenAuthFilter(
            AdminApiProperties properties, tools.jackson.databind.ObjectMapper objectMapper) {
        return new AdminTokenAuthFilter(properties, objectMapper);
    }

    /**
     * Spring Boot auto-registers every Filter bean as a global servlet filter.
     * We don't want that — the filter only belongs inside the admin
     * SecurityFilterChain we built above. Registering it globally would run it
     * twice on admin requests AND would leak it onto the default chain.
     */
    @Bean
    FilterRegistrationBean<AdminTokenAuthFilter> disableAdminFilterAutoRegistration(AdminTokenAuthFilter filter) {
        FilterRegistrationBean<AdminTokenAuthFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }
}
