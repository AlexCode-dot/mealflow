package com.mealflow.identity.web;

import com.mealflow.identity.auth.error.EmailAlreadyInUseException;
import com.mealflow.identity.auth.error.InvalidCredentialsException;
import com.mealflow.identity.auth.verification.error.EmailNotVerifiedException;
import com.mealflow.identity.auth.verification.error.InvalidVerificationCodeException;
import com.mealflow.identity.auth.verification.error.VerificationResendCooldownException;
import com.mealflow.identity.integrations.error.IntegrationTokenNotFoundException;
import com.mealflow.identity.integrations.error.InvalidScopeException;
import com.mealflow.identity.token.error.InvalidRefreshTokenException;
import com.mealflow.identity.token.error.RefreshTokenReplayException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiExceptionHandler {

    private final Clock clock;

    public ApiExceptionHandler(Clock clock) {
        this.clock = clock;
    }

    @ExceptionHandler(EmailAlreadyInUseException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ProblemDetail handleEmailAlreadyUsed(EmailAlreadyInUseException ex, HttpServletRequest req) {
        return problem(HttpStatus.CONFLICT, ex.getMessage(), req, null);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ProblemDetail handleInvalidCredentials(InvalidCredentialsException ex, HttpServletRequest req) {
        return problem(HttpStatus.UNAUTHORIZED, ex.getMessage(), req, null);
    }

    @ExceptionHandler(EmailNotVerifiedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ProblemDetail handleEmailNotVerified(EmailNotVerifiedException ex, HttpServletRequest req) {
        return problem(
                HttpStatus.FORBIDDEN,
                "Email not verified",
                req,
                Map.of("code", "EMAIL_NOT_VERIFIED", "email", ex.getEmail()));
    }

    @ExceptionHandler(InvalidVerificationCodeException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ProblemDetail handleInvalidVerificationCode(InvalidVerificationCodeException ex, HttpServletRequest req) {
        return problem(HttpStatus.BAD_REQUEST, ex.getMessage(), req, Map.of("code", "INVALID_VERIFICATION_CODE"));
    }

    @ExceptionHandler(VerificationResendCooldownException.class)
    @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
    public ProblemDetail handleResendCooldown(VerificationResendCooldownException ex, HttpServletRequest req) {
        return problem(
                HttpStatus.TOO_MANY_REQUESTS,
                ex.getMessage(),
                req,
                Map.of("code", "VERIFICATION_RESEND_COOLDOWN", "retryAfterSeconds", ex.getRetryAfterSeconds()));
    }

    @ExceptionHandler({InvalidRefreshTokenException.class, RefreshTokenReplayException.class})
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ProblemDetail handleRefreshToken(RuntimeException ex, HttpServletRequest req) {
        return problem(HttpStatus.UNAUTHORIZED, ex.getMessage(), req, null);
    }

    @ExceptionHandler(IntegrationTokenNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ProblemDetail handleIntegrationTokenNotFound(IntegrationTokenNotFoundException ex, HttpServletRequest req) {
        return problem(HttpStatus.NOT_FOUND, ex.getMessage(), req, null);
    }

    @ExceptionHandler(InvalidScopeException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ProblemDetail handleInvalidScope(InvalidScopeException ex, HttpServletRequest req) {
        return problem(HttpStatus.BAD_REQUEST, ex.getMessage(), req, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        return problem(
                HttpStatus.BAD_REQUEST,
                "Validation failed",
                req,
                Map.of(
                        "errors",
                        ex.getBindingResult().getFieldErrors().stream()
                                .map(err -> Map.of(
                                        "field", err.getField(),
                                        "message", err.getDefaultMessage()))
                                .toList()));
    }

    private ProblemDetail problem(
            HttpStatus status, String message, HttpServletRequest req, Map<String, Object> extras) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, message);
        pd.setTitle(status.getReasonPhrase());
        pd.setProperty("path", req.getRequestURI());
        pd.setProperty("timestamp", clock.instant().toString());
        if (extras != null) {
            extras.forEach(pd::setProperty);
        }
        return pd;
    }
}
