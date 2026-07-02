package com.mealflow.identity.web.auth;

import com.mealflow.identity.audit.domain.AuditEventType;
import com.mealflow.identity.audit.service.AuditService;
import com.mealflow.identity.auth.AuthService;
import com.mealflow.identity.auth.error.EmailAlreadyInUseException;
import com.mealflow.identity.auth.error.InvalidCredentialsException;
import com.mealflow.identity.auth.verification.error.EmailNotVerifiedException;
import com.mealflow.identity.token.error.InvalidRefreshTokenException;
import com.mealflow.identity.token.error.RefreshTokenReplayException;
import com.mealflow.identity.web.auth.dto.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * Auth REST surface. Every state-changing handler emits a structured audit
 * event via {@link AuditService} so the admin panel's monitoring page can
 * show real signal (login spikes, password-reset rates, token-reuse).
 *
 * <p>Audit emission is wrapped in try/catch and the service itself never
 * throws — losing one audit row must never break a real auth request.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final AuditService auditService;

    public AuthController(AuthService authService, AuditService auditService) {
        this.authService = authService;
        this.auditService = auditService;
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(
            @Valid @RequestBody RegisterRequest body, HttpServletRequest request) {
        try {
            AuthService.RegistrationResult result = authService.register(body.email(), body.password());
            auditService.log(
                    AuditEventType.REGISTER,
                    AuditEventType.OUTCOME_SUCCESS,
                    result.userId(),
                    "user",
                    result.userId(),
                    request,
                    Map.of());
            return ResponseEntity.status(HttpStatus.CREATED).body(new RegisterResponse(result.email(), true));
        } catch (EmailAlreadyInUseException e) {
            // Failure is also audit-worthy: a flood of these from one IP is a
            // signal of credential stuffing or email enumeration probing.
            auditService.log(
                    AuditEventType.REGISTER,
                    AuditEventType.OUTCOME_FAILURE,
                    null,
                    null,
                    null,
                    request,
                    Map.of("reason", "email_in_use"));
            throw e;
        }
    }

    @PostMapping("/verify-email")
    public AuthResponse verifyEmail(@Valid @RequestBody VerifyEmailRequest body, HttpServletRequest request) {
        AuthService.AuthTokens tokens = authService.verifyEmail(body.email(), body.code());
        auditService.log(
                AuditEventType.EMAIL_VERIFIED,
                AuditEventType.OUTCOME_SUCCESS,
                tokens.userId(),
                "user",
                tokens.userId(),
                request,
                Map.of());
        return new AuthResponse(tokens.accessToken(), tokens.refreshToken());
    }

    @PostMapping("/resend-verification")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void resendVerification(@Valid @RequestBody ResendVerificationRequest body, HttpServletRequest request) {
        authService.resendVerification(body.email());
        // No userId attribution here — the user may not exist, and we don't
        // want to confirm/deny that. IP+UA is enough for abuse detection.
        auditService.log(
                AuditEventType.EMAIL_VERIFICATION_RESENT,
                AuditEventType.OUTCOME_SUCCESS,
                null,
                null,
                null,
                request,
                Map.of());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest request) {
        try {
            AuthService.AuthTokens tokens = authService.login(body.email(), body.password());
            auditService.log(
                    AuditEventType.LOGIN,
                    AuditEventType.OUTCOME_SUCCESS,
                    tokens.userId(),
                    "user",
                    tokens.userId(),
                    request,
                    Map.of());
            return new AuthResponse(tokens.accessToken(), tokens.refreshToken());
        } catch (InvalidCredentialsException e) {
            // Deliberately NOT storing the attempted email — that would give an
            // attacker who breaches the audit collection a list of probed
            // accounts. IP+UA is the operational signal we actually need.
            auditService.log(
                    AuditEventType.LOGIN,
                    AuditEventType.OUTCOME_FAILURE,
                    null,
                    null,
                    null,
                    request,
                    Map.of("reason", "invalid_credentials"));
            throw e;
        } catch (EmailNotVerifiedException e) {
            auditService.log(
                    AuditEventType.LOGIN,
                    AuditEventType.OUTCOME_FAILURE,
                    null,
                    null,
                    null,
                    request,
                    Map.of("reason", "email_not_verified"));
            throw e;
        }
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        return new MeResponse(userId, authService.getUserEmail(userId));
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest body, HttpServletRequest request) {
        try {
            AuthService.AuthTokens tokens = authService.refresh(body.refreshToken());
            // Don't emit a success event on every refresh — they happen every
            // ~15 min for every active session and would dominate the audit
            // volume without adding signal.
            return new AuthResponse(tokens.accessToken(), tokens.refreshToken());
        } catch (RefreshTokenReplayException e) {
            // Token reuse is a hard signal — the same refresh token was
            // presented twice. Either a token leaked, or the client got into
            // a bad retry loop. Surfaced separately from regular invalid
            // refreshes so the admin panel can flag it loudly.
            auditService.log(AuditEventType.TOKEN_REUSE_DETECTED, null, null, null, null, request, Map.of());
            throw e;
        } catch (InvalidRefreshTokenException e) {
            // Regular invalid-refresh (expired/unknown) isn't logged — too
            // noisy and benign in practice. Bubble through to the standard
            // 401 path.
            throw e;
        }
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody LogoutRequest body, HttpServletRequest request) {
        authService.logout(body.refreshToken());
        auditService.log(AuditEventType.LOGOUT, AuditEventType.OUTCOME_SUCCESS, null, null, null, request, Map.of());
    }
}
