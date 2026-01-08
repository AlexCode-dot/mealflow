package com.mealflow.appapi.error;

import com.mealflow.appapi.recipes.service.RecipeNotFoundException;
import com.mealflow.appapi.recipes.service.RecipeValidationException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    private final ProblemDetails problems;

    public ApiExceptionHandler(ProblemDetails problems) {
        this.problems = problems;
    }

    @ExceptionHandler(RecipeNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ProblemDetail handleRecipeNotFound(RecipeNotFoundException ex, HttpServletRequest req) {
        return problems.build(HttpStatus.NOT_FOUND, ex.getMessage(), req);
    }

    @ExceptionHandler(RecipeValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ProblemDetail handleRecipeValidation(RecipeValidationException ex, HttpServletRequest req) {
        return problems.build(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        return problems.build(
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

    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ProblemDetail handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest req) {
        return problems.build(
                HttpStatus.BAD_REQUEST,
                "Validation failed",
                req,
                Map.of(
                        "errors",
                        ex.getConstraintViolations().stream()
                                .map(v -> Map.of(
                                        "field", v.getPropertyPath().toString(),
                                        "message", v.getMessage()))
                                .toList()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ProblemDetail handleBadJson(HttpMessageNotReadableException ex, HttpServletRequest req) {
        return problems.build(HttpStatus.BAD_REQUEST, "Malformed JSON request body", req);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest req) {
        return problems.build(
                HttpStatus.BAD_REQUEST,
                "Invalid request parameter",
                req,
                Map.of("param", ex.getName(), "value", String.valueOf(ex.getValue())));
    }

    // LAST: never leak exception details to the client
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ProblemDetail handleUnexpected(Exception ex, HttpServletRequest req) {
        log.error("Unexpected error at {} {}", req.getMethod(), req.getRequestURI(), ex);
        return problems.build(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error", req);
    }
}
