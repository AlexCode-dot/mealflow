package com.mealflow.identity.security.config;

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
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
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
            HttpSecurity http, SecurityProblemSupport problems, RateLimitFilter rateLimitFilter) throws Exception {
        return http.csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
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
                        .requestMatchers("/auth/**", "/.well-known/jwks.json")
                        .permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/account")
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
        decoder.setJwtValidator(withIssuer);
        return decoder;
    }
}
