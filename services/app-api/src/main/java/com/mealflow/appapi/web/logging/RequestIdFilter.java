package com.mealflow.appapi.web.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RequestIdFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String REQUEST_ID_MDC_KEY = "requestId";
    private static final int MAX_HEADER_LENGTH = 128;
    private static final String REQUEST_ID_ALLOWED_PATTERN = "^[A-Za-z0-9._:-]+$";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestId = resolveRequestId(request.getHeader(REQUEST_ID_HEADER));

        response.setHeader(REQUEST_ID_HEADER, requestId);
        MDC.put(REQUEST_ID_MDC_KEY, requestId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(REQUEST_ID_MDC_KEY);
        }
    }

    private String resolveRequestId(String candidate) {
        if (candidate == null) {
            return UUID.randomUUID().toString();
        }

        String trimmed = candidate.trim();
        if (trimmed.isBlank()
                || trimmed.length() > MAX_HEADER_LENGTH
                || !trimmed.matches(REQUEST_ID_ALLOWED_PATTERN)) {
            return UUID.randomUUID().toString();
        }
        return trimmed;
    }
}
