package com.mealflow.identity.security.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // No cookies, no sessions → CSRF not applicable
                .csrf(AbstractHttpConfigurer::disable)

                // Use our CorsConfigurationSource bean
                .cors(Customizer.withDefaults())

                // Identity service is stateless
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Disable unused defaults
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)

                // Public endpoints
                .authorizeHttpRequests(auth -> auth.requestMatchers("/auth/**", "/.well-known/jwks.json")
                        .permitAll()
                        .anyRequest()
                        .authenticated())
                .build();
    }
}
