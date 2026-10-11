package com.mealflow.identity.oauth.config;

import com.mealflow.identity.oauth.service.OAuthLoginAuthenticationProvider;
import com.mealflow.identity.oauth.web.OAuthLoginHandlers;
import com.mealflow.identity.web.logging.RequestIdFilter;
import com.mealflow.identity.web.ratelimit.RateLimitFilter;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.OAuth2TokenFormat;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

/**
 * OAuth 2.0 authorization server (Spring Authorization Server) for connected apps — today only
 * Personal OS (MF1, PA-011). Authorization code + PKCE (S256) only, confidential client, rotating
 * refresh tokens with reuse detection (see {@code MongoOAuth2AuthorizationService}), revocation.
 *
 * <p>Three filter chains, most specific first:
 * <ol>
 *   <li>protocol endpoints ({@code /oauth2/authorize}, {@code /oauth2/token}, {@code /oauth2/revoke},
 *       metadata, jwks) — owned by the library;
 *   <li>the browser pages of the flow ({@code /oauth/login}, sign-up, email verification and the
 *       consent page) — session + CSRF, form login against MealFlow's own accounts;
 *   <li>the existing stateless first-party API chain ({@code SecurityConfig}), unchanged.
 * </ol>
 */
@Configuration
@EnableConfigurationProperties(OAuthClientProperties.class)
public class AuthorizationServerConfig {

    public static final String LOGIN_PAGE = "/oauth/login";
    public static final String CONSENT_PAGE = "/oauth2/consent";

    @Bean
    @Order(1)
    SecurityFilterChain authorizationServerSecurityFilterChain(
            HttpSecurity http, RequestIdFilter requestIdFilter, RateLimitFilter rateLimitFilter) throws Exception {
        http.oauth2AuthorizationServer(as -> {
                    http.securityMatcher(as.getEndpointsMatcher());
                    as.authorizationEndpoint(endpoint -> endpoint.consentPage(CONSENT_PAGE));
                })
                .addFilterBefore(requestIdFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                // Unauthenticated browser hitting /oauth2/authorize -> MealFlow login page.
                .exceptionHandling(ex -> ex.defaultAuthenticationEntryPointFor(
                        new LoginUrlAuthenticationEntryPoint(LOGIN_PAGE),
                        PathPatternRequestMatcher.withDefaults().matcher("/oauth2/authorize")));
        return http.build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain oauthPagesSecurityFilterChain(
            HttpSecurity http,
            OAuthLoginAuthenticationProvider loginProvider,
            OAuthLoginHandlers handlers,
            RequestIdFilter requestIdFilter,
            RateLimitFilter rateLimitFilter)
            throws Exception {
        // "/error": protocol errors without a safe redirect (e.g. unregistered redirect_uri) are
        // rendered via the error dispatch; let them show their real status instead of the API
        // chain's deny-all 401.
        return http.securityMatcher("/oauth/**", CONSENT_PAGE, "/error")
                // Before CSRF: a login flood must be counted even when it carries no CSRF token.
                .addFilterBefore(requestIdFilter, CsrfFilter.class)
                .addFilterBefore(rateLimitFilter, CsrfFilter.class)
                .authenticationProvider(loginProvider)
                .authorizeHttpRequests(auth -> auth.requestMatchers(CONSENT_PAGE)
                        .authenticated()
                        .anyRequest()
                        .permitAll())
                .formLogin(form -> form.loginPage(LOGIN_PAGE)
                        .loginProcessingUrl(LOGIN_PAGE)
                        .usernameParameter("email")
                        .passwordParameter("password")
                        .successHandler(handlers)
                        .failureHandler(handlers))
                .logout(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .build();
    }

    @Bean
    RegisteredClientRepository registeredClientRepository(OAuthClientProperties props) {
        Map<String, RegisteredClient> byId = new HashMap<>();
        Map<String, RegisteredClient> byClientId = new HashMap<>();
        if (props.isConfigured()) {
            RegisteredClient client = personalOsClient(props);
            byId.put(client.getId(), client);
            byClientId.put(client.getClientId(), client);
        }
        return new ConfiguredClientRepository(byId, byClientId);
    }

    static RegisteredClient personalOsClient(OAuthClientProperties props) {
        return RegisteredClient.withId(OAuthScopes.PERSONAL_OS_REGISTERED_ID)
                .clientId(props.clientId())
                .clientName("Personal OS")
                // Stored hashed in memory; the raw secret only ever lives in the environment.
                .clientSecret(PasswordEncoderFactories.createDelegatingPasswordEncoder()
                        .encode(props.clientSecret()))
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
                .redirectUris(uris -> uris.addAll(props.redirectUris()))
                .scopes(scopes -> scopes.addAll(OAuthScopes.ALL))
                .clientSettings(ClientSettings.builder()
                        .requireProofKey(true)
                        .requireAuthorizationConsent(true)
                        .build())
                .tokenSettings(TokenSettings.builder()
                        .accessTokenFormat(OAuth2TokenFormat.SELF_CONTAINED)
                        .accessTokenTimeToLive(Duration.ofMinutes(props.accessTokenTtlMinutes()))
                        .refreshTokenTimeToLive(Duration.ofDays(props.refreshTokenTtlDays()))
                        .authorizationCodeTimeToLive(Duration.ofMinutes(props.authorizationCodeTtlMinutes()))
                        .reuseRefreshTokens(false)
                        .build())
                .build();
    }

    @Bean
    AuthorizationServerSettings authorizationServerSettings(@Value("${jwt.issuer}") String issuer) {
        return AuthorizationServerSettings.builder().issuer(issuer).build();
    }

    /** Same signing key as first-party tokens (kid mealflow-identity-rs256); audiences differ. */
    @Bean
    JWKSource<SecurityContext> jwkSource(RSAKey rsaJwk) {
        return new ImmutableJWKSet<>(new JWKSet(rsaJwk));
    }

    /**
     * Access tokens for connected apps carry {@code aud=mealflow-integrations}, the {@code
     * client_id} and the grant id ({@code gid}) so app-api can (a) only accept them on
     * /integrations/v1, (b) reject them once the user disconnects the app.
     */
    @Bean
    OAuth2TokenCustomizer<JwtEncodingContext> integrationAccessTokenCustomizer() {
        return context -> {
            if (!OAuth2TokenType.ACCESS_TOKEN.equals(context.getTokenType())) {
                return;
            }
            context.getClaims()
                    .audience(List.of(OAuthScopes.INTEGRATIONS_AUDIENCE))
                    .claim("client_id", context.getRegisteredClient().getClientId());
            if (context.getAuthorization() != null) {
                context.getClaims().claim("gid", context.getAuthorization().getId());
            }
        };
    }
}
