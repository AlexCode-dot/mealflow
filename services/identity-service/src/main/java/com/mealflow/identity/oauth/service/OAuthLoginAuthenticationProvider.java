package com.mealflow.identity.oauth.service;

import com.mealflow.identity.auth.PasswordService;
import com.mealflow.identity.user.domain.User;
import com.mealflow.identity.user.repository.UserRepository;
import java.util.List;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

/**
 * Authenticates the browser login of the OAuth flow against MealFlow's own accounts — same
 * checks as {@code AuthService.login} (argon2 password, verified email) plus disabled/deleted.
 * The resulting principal name is the MealFlow user id, which becomes the token {@code sub}.
 *
 * <p>Deliberately not a global bean-registered provider: it is attached only to the OAuth pages
 * filter chain.
 */
@Component
public class OAuthLoginAuthenticationProvider implements AuthenticationProvider {

    private final UserRepository userRepository;
    private final PasswordService passwordService;

    public OAuthLoginAuthenticationProvider(UserRepository userRepository, PasswordService passwordService) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
    }

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        String email = normalizeEmail(authentication.getName());
        Object credentials = authentication.getCredentials();
        String password = credentials == null ? "" : credentials.toString();

        User user = userRepository
                .findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        if (!passwordService.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }
        if (user.isDeleted() || user.isDisabled()) {
            throw new BadCredentialsException("Invalid email or password");
        }
        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedAuthenticationException(user.getEmail());
        }
        return authenticated(user.getId());
    }

    public static UsernamePasswordAuthenticationToken authenticated(String userId) {
        return UsernamePasswordAuthenticationToken.authenticated(
                userId, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
    }

    public static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    /** Password was right but the email isn't verified yet — the flow continues to the OTP page. */
    public static class EmailNotVerifiedAuthenticationException extends AuthenticationException {
        private final String email;

        public EmailNotVerifiedAuthenticationException(String email) {
            super("Email not verified");
            this.email = email;
        }

        public String getEmail() {
            return email;
        }
    }
}
