package com.mealflow.appapi.security.config;

import com.mealflow.appapi.security.integrations.IntegrationTokenAuthenticationFilter;
import com.mealflow.appapi.security.oauth.FirstPartyTokenValidator;
import com.mealflow.appapi.security.oauth.ValidatingJwtDecoder;
import com.mealflow.appapi.web.logging.RequestIdFilter;
import com.mealflow.appapi.web.ratelimit.RateLimitFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            SecurityProblemSupport problems,
            RateLimitFilter rateLimitFilter,
            RequestIdFilter requestIdFilter,
            IntegrationTokenAuthenticationFilter integrationTokenAuthenticationFilter,
            JwtDecoder jwtDecoder)
            throws Exception {
        // Third-party OAuth tokens (aud=mealflow-integrations / client_id) are only valid on
        // /integrations/** (see IntegrationSecurityConfig) — never on the first-party API.
        JwtDecoder firstPartyDecoder = new ValidatingJwtDecoder(jwtDecoder, new FirstPartyTokenValidator());

        return http.csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .addFilterBefore(requestIdFilter, BearerTokenAuthenticationFilter.class)
                .addFilterBefore(integrationTokenAuthenticationFilter, BearerTokenAuthenticationFilter.class)
                .addFilterAfter(rateLimitFilter, BearerTokenAuthenticationFilter.class)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(
                        ex -> ex.authenticationEntryPoint(problems) // 401
                                .accessDeniedHandler(problems) // 403
                        )
                .authorizeHttpRequests(auth -> auth.requestMatchers(HttpMethod.OPTIONS, "/**")
                        .permitAll()
                        .requestMatchers("/actuator/health")
                        .permitAll()
                        .requestMatchers("/api/**")
                        .authenticated()
                        .anyRequest()
                        .denyAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.decoder(firstPartyDecoder)))
                .build();
    }

    @Bean
    JwtDecoder jwtDecoder(
            @Value("${security.jwt.jwks-uri}") String jwksUri, @Value("${security.jwt.issuer}") String issuer) {

        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri).build();

        // Default validators include exp/nbf checks; add issuer validation too.
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuer);

        decoder.setJwtValidator(withIssuer);
        return decoder;
    }
}
