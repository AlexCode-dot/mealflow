package com.mealflow.identity.oauth.web;

import com.mealflow.identity.audit.domain.AuditEventType;
import com.mealflow.identity.audit.service.AuditService;
import com.mealflow.identity.auth.AuthService;
import com.mealflow.identity.auth.error.EmailAlreadyInUseException;
import com.mealflow.identity.auth.verification.EmailVerificationService;
import com.mealflow.identity.auth.verification.error.InvalidVerificationCodeException;
import com.mealflow.identity.auth.verification.error.VerificationResendCooldownException;
import com.mealflow.identity.oauth.config.OAuthScopes;
import com.mealflow.identity.oauth.service.OAuthLoginAuthenticationProvider;
import com.mealflow.identity.user.domain.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.security.Principal;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationConsent;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.savedrequest.HttpSessionRequestCache;
import org.springframework.security.web.savedrequest.SavedRequest;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * Browser pages of the OAuth flow (login, sign-up, email code, consent). All copy comes from
 * {@code messages*.properties} (EN default, SV) — nothing user-facing is hardcoded here.
 */
@Controller
public class OAuthPagesController {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;
    private final RegisteredClientRepository clients;
    private final OAuth2AuthorizationConsentService consents;
    private final AuditService auditService;
    private final HttpSessionSecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();
    private final HttpSessionRequestCache requestCache = new HttpSessionRequestCache();

    public OAuthPagesController(
            AuthService authService,
            EmailVerificationService emailVerificationService,
            RegisteredClientRepository clients,
            OAuth2AuthorizationConsentService consents,
            AuditService auditService) {
        this.authService = authService;
        this.emailVerificationService = emailVerificationService;
        this.clients = clients;
        this.consents = consents;
        this.auditService = auditService;
    }

    @GetMapping("/oauth/login")
    public String login(@RequestParam(required = false) String error, Model model) {
        model.addAttribute("error", error != null);
        return "oauth/login";
    }

    @GetMapping("/oauth/signup")
    public String signupForm() {
        return "oauth/signup";
    }

    @PostMapping("/oauth/signup")
    public String signup(
            @RequestParam String email,
            @RequestParam String password,
            HttpServletRequest request,
            HttpSession session,
            Model model) {
        String normalized = OAuthLoginAuthenticationProvider.normalizeEmail(email);
        // Same rules as RegisterRequest (@Email, 8..72 chars).
        if (!EMAIL.matcher(normalized).matches() || password.length() < 8 || password.length() > 72) {
            model.addAttribute("error", "oauth.signup.error.invalid");
            return "oauth/signup";
        }
        try {
            AuthService.RegistrationResult result = authService.register(normalized, password);
            auditService.log(
                    AuditEventType.REGISTER,
                    AuditEventType.OUTCOME_SUCCESS,
                    result.userId(),
                    "user",
                    result.userId(),
                    request,
                    Map.of("channel", "oauth"));
        } catch (EmailAlreadyInUseException e) {
            auditService.log(
                    AuditEventType.REGISTER,
                    AuditEventType.OUTCOME_FAILURE,
                    null,
                    null,
                    null,
                    request,
                    Map.of("channel", "oauth", "reason", "EMAIL_IN_USE"));
            model.addAttribute("error", "oauth.signup.error.failed");
            return "oauth/signup";
        }
        session.setAttribute(OAuthLoginHandlers.SESSION_PENDING_EMAIL, normalized);
        return "redirect:/oauth/verify";
    }

    @GetMapping("/oauth/verify")
    public String verifyForm(HttpSession session) {
        if (session.getAttribute(OAuthLoginHandlers.SESSION_PENDING_EMAIL) == null) {
            return "redirect:/oauth/login";
        }
        return "oauth/verify";
    }

    @PostMapping("/oauth/verify")
    public String verify(
            @RequestParam String code,
            HttpServletRequest request,
            HttpServletResponse response,
            HttpSession session,
            Model model)
            throws IOException {
        Object email = session.getAttribute(OAuthLoginHandlers.SESSION_PENDING_EMAIL);
        if (email == null) {
            return "redirect:/oauth/login";
        }
        User user;
        try {
            user = emailVerificationService.verify(email.toString(), code.trim());
        } catch (InvalidVerificationCodeException e) {
            model.addAttribute("error", "oauth.verify.error.invalid");
            return "oauth/verify";
        }
        auditService.log(
                AuditEventType.EMAIL_VERIFIED,
                AuditEventType.OUTCOME_SUCCESS,
                user.getId(),
                "user",
                user.getId(),
                request,
                Map.of("channel", "oauth"));
        session.removeAttribute(OAuthLoginHandlers.SESSION_PENDING_EMAIL);

        // The verified user is now signed in for this browser flow (same as the API returning
        // tokens after verify-email) and continues to the consent screen.
        request.changeSessionId();
        Authentication auth = OAuthLoginAuthenticationProvider.authenticated(user.getId());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);

        SavedRequest saved = requestCache.getRequest(request, response);
        return saved != null ? "redirect:" + saved.getRedirectUrl() : "oauth/done";
    }

    @PostMapping("/oauth/verify/resend")
    public String resend(HttpSession session, Model model) {
        Object email = session.getAttribute(OAuthLoginHandlers.SESSION_PENDING_EMAIL);
        if (email == null) {
            return "redirect:/oauth/login";
        }
        try {
            emailVerificationService.resendFor(email.toString());
            model.addAttribute("info", "oauth.verify.resent");
        } catch (VerificationResendCooldownException e) {
            model.addAttribute("info", "oauth.verify.cooldown");
        }
        return "oauth/verify";
    }

    @GetMapping("/oauth2/consent")
    public String consent(
            Principal principal,
            @RequestParam("client_id") String clientId,
            @RequestParam("scope") String scope,
            @RequestParam("state") String state,
            Model model) {
        RegisteredClient client = clients.findByClientId(clientId);
        if (client == null) {
            return "redirect:/oauth/login?error";
        }
        Set<String> alreadyGranted = new LinkedHashSet<>();
        OAuth2AuthorizationConsent existing = consents.findById(client.getId(), principal.getName());
        if (existing != null) {
            alreadyGranted.addAll(existing.getScopes());
        }
        Set<String> requested = new LinkedHashSet<>(Arrays.asList(scope.split(" ")));
        // Show scopes in canonical order, only ones the client may ask for.
        List<String> toApprove = OAuthScopes.ALL.stream()
                .filter(requested::contains)
                .filter(client.getScopes()::contains)
                .filter(s -> !alreadyGranted.contains(s))
                .toList();
        List<String> previously = OAuthScopes.ALL.stream()
                .filter(requested::contains)
                .filter(alreadyGranted::contains)
                .toList();

        model.addAttribute("clientId", clientId);
        model.addAttribute("clientName", client.getClientName());
        model.addAttribute("state", state);
        model.addAttribute("scopes", toApprove);
        model.addAttribute("previouslyApprovedScopes", previously);
        return "oauth/consent";
    }
}
