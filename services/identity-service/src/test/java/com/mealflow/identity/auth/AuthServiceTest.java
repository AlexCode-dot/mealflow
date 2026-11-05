package com.mealflow.identity.auth;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.mealflow.identity.auth.error.InvalidCredentialsException;
import com.mealflow.identity.auth.reset.PasswordResetService;
import com.mealflow.identity.auth.verification.EmailVerificationService;
import com.mealflow.identity.security.jwt.AccessTokenService;
import com.mealflow.identity.token.service.RefreshTokenService;
import com.mealflow.identity.user.repository.UserRepository;
import java.time.Clock;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class AuthServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final AccessTokenService accessTokenService = mock(AccessTokenService.class);
    private final RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);

    private AuthService authServiceWith(PasswordService passwordService) {
        return new AuthService(
                userRepository,
                passwordService,
                accessTokenService,
                refreshTokenService,
                mock(EmailVerificationService.class),
                mock(PasswordResetService.class),
                Clock.systemUTC());
    }

    @Test
    void login_unknownEmail_stillRunsPasswordCheckAgainstDummyHash() {
        PasswordService passwordService = mock(PasswordService.class);
        when(passwordService.hash(anyString())).thenReturn("dummy-hash");
        AuthService authService = authServiceWith(passwordService);
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThrows(InvalidCredentialsException.class, () -> authService.login(" Nobody@Example.com ", "hunter22"));

        verify(passwordService).matches("hunter22", "dummy-hash");
        verifyNoInteractions(accessTokenService, refreshTokenService);
    }

    @Test
    void login_unknownEmail_dummyHashUsesSameArgon2ParametersAsRealHashes() {
        PasswordService passwordService = spy(new PasswordService());
        AuthService authService = authServiceWith(passwordService);
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());

        assertThrows(InvalidCredentialsException.class, () -> authService.login("nobody@example.com", "hunter22"));

        ArgumentCaptor<String> dummyHash = ArgumentCaptor.forClass(String.class);
        verify(passwordService).matches(eq("hunter22"), dummyHash.capture());
        // Encoded form is $argon2id$v=19$m=…,t=…,p=…$salt$hash — the first four segments carry the cost.
        assertThat(costPrefix(dummyHash.getValue()), is(costPrefix(passwordService.hash("real-password"))));
    }

    private static String costPrefix(String encodedArgon2Hash) {
        return encodedArgon2Hash.substring(
                0, encodedArgon2Hash.lastIndexOf('$', encodedArgon2Hash.lastIndexOf('$') - 1));
    }
}
