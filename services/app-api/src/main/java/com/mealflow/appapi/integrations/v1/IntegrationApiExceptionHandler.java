package com.mealflow.appapi.integrations.v1;

import com.mealflow.appapi.error.ProblemDetails;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Integration-API-specific errors (400/404/409/412/422). Everything else (bean validation, the
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

    @ExceptionHandler(IntegrationApiException.class)
    public ResponseEntity<ProblemDetail> handle(IntegrationApiException ex, HttpServletRequest req) {
        return ResponseEntity.status(ex.getStatus())
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(problems.build(ex.getStatus(), ex.getMessage(), req));
    }
}
