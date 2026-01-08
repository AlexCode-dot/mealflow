package com.mealflow.appapi.security.config;

import com.mealflow.appapi.error.ProblemDetails;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class SecurityProblemSupport implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper objectMapper;
    private final ProblemDetails problems;

    public SecurityProblemSupport(ObjectMapper objectMapper, ProblemDetails problems) {
        this.objectMapper = objectMapper;
        this.problems = problems;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException ex)
            throws IOException {

        writeProblem(response, problems.build(HttpStatus.UNAUTHORIZED, "Unauthorized", request));
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException ex)
            throws IOException {

        writeProblem(response, problems.build(HttpStatus.FORBIDDEN, "Forbidden", request));
    }

    private void writeProblem(HttpServletResponse response, ProblemDetail pd) throws IOException {
        response.setStatus(pd.getStatus());
        response.setContentType("application/problem+json");
        objectMapper.writeValue(response.getOutputStream(), pd);
    }
}
