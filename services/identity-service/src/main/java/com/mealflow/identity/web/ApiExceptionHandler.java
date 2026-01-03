package com.mealflow.identity.web;

import com.mealflow.identity.auth.error.EmailAlreadyInUseException;
import com.mealflow.identity.auth.error.InvalidCredentialsException;
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

    @ExceptionHandler({InvalidRefreshTokenException.class, RefreshTokenReplayException.class})
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ProblemDetail handleRefreshToken(RuntimeException ex, HttpServletRequest req) {
        return problem(HttpStatus.UNAUTHORIZED, ex.getMessage(), req, null);
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
