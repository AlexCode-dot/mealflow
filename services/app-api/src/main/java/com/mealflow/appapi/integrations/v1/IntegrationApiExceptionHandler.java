package com.mealflow.appapi.integrations.v1;

import com.mealflow.appapi.error.ProblemDetails;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Integration-API-specific errors (400/403/404/409/412/422/429). Everything else (bean validation, the
 * domain not-found / validation exceptions, 500) falls through to the global ApiExceptionHandler,
 * so the problem+json shape is identical.
 */
@RestControllerAdvice(basePackageClasses = IntegrationApiExceptionHandler.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class IntegrationApiExceptionHandler {

    private final ProblemDetails problems;

    public IntegrationApiExceptionHandler(ProblemDetails problems) {
        this.problems = problems;
    }

    /** Same shape as the global 429 (Retry-After header, retryAfterSeconds), plus the code. */
    @ExceptionHandler(FromPlanRateLimitedException.class)
    public ResponseEntity<ProblemDetail> handleRateLimited(FromPlanRateLimitedException ex, HttpServletRequest req) {
        return ResponseEntity.status(ex.getStatus())
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(problems.build(
                        ex.getStatus(),
                        ex.getMessage(),
                        req,
                        Map.of("retryAfterSeconds", ex.getRetryAfterSeconds(), "code", ex.getCode())));
    }

    @ExceptionHandler(IntegrationApiException.class)
    public ResponseEntity<ProblemDetail> handle(IntegrationApiException ex, HttpServletRequest req) {
        return ResponseEntity.status(ex.getStatus())
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(problems.build(
                        ex.getStatus(),
                        ex.getMessage(),
                        req,
                        ex.getCode() == null ? null : Map.of("code", ex.getCode())));
    }
}
