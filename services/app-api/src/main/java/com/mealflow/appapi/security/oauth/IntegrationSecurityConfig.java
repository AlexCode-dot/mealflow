package com.mealflow.appapi.security.oauth;

import com.mealflow.appapi.security.config.SecurityProblemSupport;
import com.mealflow.appapi.web.logging.RequestIdFilter;
import com.mealflow.appapi.web.ratelimit.RateLimitFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Resource-server chain for the third-party integration API ({@code /integrations/**}). Runs before
 * the first-party chain. Accepts only OAuth access tokens issued by identity-service for the {@code
 * mealflow-integrations} audience whose grant is still active, and enforces scopes per endpoint.
 */
@Configuration
public class IntegrationSecurityConfig {

    private static final String V1 = "/integrations/v1";

    @Bean
    @Order(1)
    SecurityFilterChain integrationSecurityFilterChain(
            HttpSecurity http,
            SecurityProblemSupport problems,
            RateLimitFilter rateLimitFilter,
            RequestIdFilter requestIdFilter,
            JwtDecoder jwtDecoder,
            OAuthGrantValidator grantValidator,
            @Value("${security.jwt.issuer}") String issuer)
            throws Exception {

        JwtDecoder integrationDecoder = new ValidatingJwtDecoder(
                jwtDecoder,
                new DelegatingOAuth2TokenValidator<>(
                        JwtValidators.createDefaultWithIssuer(issuer),
                        new IntegrationTokenValidator(),
                        grantValidator));

        return http.securityMatcher("/integrations/**")
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .addFilterBefore(requestIdFilter, BearerTokenAuthenticationFilter.class)
                .addFilterBefore(new IntegrationAuditFilter(), BearerTokenAuthenticationFilter.class)
                .addFilterAfter(rateLimitFilter, BearerTokenAuthenticationFilter.class)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(ex -> ex.authenticationEntryPoint(problems).accessDeniedHandler(problems))
                .authorizeHttpRequests(auth -> auth.requestMatchers(HttpMethod.OPTIONS, "/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, V1 + "/recipes", V1 + "/recipes/**")
                        .hasAuthority("SCOPE_recipes.read")
                        .requestMatchers(V1 + "/recipes", V1 + "/recipes/**")
                        .hasAuthority("SCOPE_recipes.write")
                        .requestMatchers(HttpMethod.GET, V1 + "/meal-plans", V1 + "/meal-plans/**")
                        .hasAuthority("SCOPE_mealplan.read")
                        .requestMatchers(V1 + "/meal-plans", V1 + "/meal-plans/**")
                        .hasAuthority("SCOPE_mealplan.write")
                        .requestMatchers(HttpMethod.GET, V1 + "/shopping-lists", V1 + "/shopping-lists/**")
                        .hasAuthority("SCOPE_shoppinglist.read")
                        .requestMatchers(V1 + "/shopping-lists", V1 + "/shopping-lists/**")
                        .hasAuthority("SCOPE_shoppinglist.write")
                        .anyRequest()
                        .denyAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.decoder(integrationDecoder))
                        .authenticationEntryPoint(problems)
                        .accessDeniedHandler(problems))
                .build();
    }
}
