package com.mealflow.identity.oauth.web;

import com.mealflow.identity.audit.domain.AuditEventType;
import com.mealflow.identity.audit.service.AuditService;
import com.mealflow.identity.auth.verification.EmailVerificationService;
import com.mealflow.identity.auth.verification.error.VerificationResendCooldownException;
import com.mealflow.identity.oauth.service.OAuthLoginAuthenticationProvider.EmailNotVerifiedAuthenticationException;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

/**
 * Login outcome handling for the OAuth browser flow: audit every attempt (same event type as the
 * API login, tagged {@code channel=oauth}), continue to the saved /oauth2/authorize request on
 * success, and route unverified accounts into the email-code (OTP) step.
 */
@Component
public class OAuthLoginHandlers implements AuthenticationSuccessHandler, AuthenticationFailureHandler {

    public static final String SESSION_PENDING_EMAIL = "oauth.pendingEmail";

    private final AuditService auditService;
    private final EmailVerificationService emailVerificationService;
    private final SavedRequestAwareAuthenticationSuccessHandler continueToAuthorize =
            new SavedRequestAwareAuthenticationSuccessHandler();

    public OAuthLoginHandlers(AuditService auditService, EmailVerificationService emailVerificationService) {
        this.auditService = auditService;
        this.emailVerificationService = emailVerificationService;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {
        auditService.log(
                AuditEventType.LOGIN,
                AuditEventType.OUTCOME_SUCCESS,
                authentication.getName(),
                "user",
                authentication.getName(),
                request,
                Map.of("channel", "oauth"));
        continueToAuthorize.onAuthenticationSuccess(request, response, authentication);
    }

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
            throws IOException {
        if (exception instanceof EmailNotVerifiedAuthenticationException unverified) {
            request.getSession().setAttribute(SESSION_PENDING_EMAIL, unverified.getEmail());
            try {
                emailVerificationService.resendFor(unverified.getEmail());
            } catch (VerificationResendCooldownException ignored) {
                // A recent code is still valid — the verify page offers "resend" later.
            }
            auditService.log(
                    AuditEventType.LOGIN,
                    AuditEventType.OUTCOME_FAILURE,
                    null,
                    null,
                    null,
                    request,
                    Map.of("channel", "oauth", "reason", "EMAIL_NOT_VERIFIED"));
            response.sendRedirect(request.getContextPath() + "/oauth/verify");
            return;
        }
        auditService.log(
                AuditEventType.LOGIN,
                AuditEventType.OUTCOME_FAILURE,
                null,
                null,
                null,
                request,
                Map.of("channel", "oauth", "reason", "INVALID_CREDENTIALS"));
        response.sendRedirect(request.getContextPath() + "/oauth/login?error");
    }
}
