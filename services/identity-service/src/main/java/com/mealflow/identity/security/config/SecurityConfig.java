package com.mealflow.identity.security.config;

import com.mealflow.identity.web.logging.RequestIdFilter;
import com.mealflow.identity.web.ratelimit.RateLimitFilter;
import java.security.interfaces.RSAPublicKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            SecurityProblemSupport problems,
            RateLimitFilter rateLimitFilter,
            RequestIdFilter requestIdFilter)
            throws Exception {
        return http.csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .addFilterBefore(requestIdFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
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
                        .requestMatchers("/healthz")
                        .permitAll()
                        .requestMatchers("/auth/integrations", "/auth/integrations/**")
                        .authenticated()
                        .requestMatchers(HttpMethod.GET, "/auth/me")
                        .authenticated()
                        .requestMatchers("/auth/**", "/.well-known/jwks.json")
                        .permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/account")
                        .authenticated()
                        .requestMatchers("/account/connections", "/account/connections/**")
                        .authenticated()
                        // .requestMatchers("/actuator/health").permitAll()
                        .anyRequest()
                        .denyAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))
                .build();
    }

    @Bean
    JwtDecoder jwtDecoder(@Value("${jwt.issuer}") String issuer, RSAPublicKey publicKey) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuer);
        // Access tokens issued to connected apps (Personal OS) are signed with the same key but
        // carry an audience / client_id. They are only valid on app-api's /integrations/v1 —
        // never on the first-party API (e.g. they must not be able to delete the account).
        OAuth2TokenValidator<Jwt> firstPartyOnly =
                jwt -> (jwt.getAudience() == null || jwt.getAudience().isEmpty()) && !jwt.hasClaim("client_id")
                        ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(
                                new OAuth2Error("invalid_token", "Connected-app tokens are not accepted here", null));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withIssuer, firstPartyOnly));
        return decoder;
    }
}
