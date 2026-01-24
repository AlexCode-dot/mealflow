package com.mealflow.appapi.web.ratelimit;

import com.mealflow.appapi.error.ProblemDetails;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BandwidthBuilder;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitProperties props;
    private final ProblemDetails problems;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitFilter(RateLimitProperties props, ProblemDetails problems, ObjectMapper objectMapper) {
        this.props = props;
        this.problems = problems;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (!props.isEnabled() || shouldSkip(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = "api:" + rateLimitKey(request);
        Bucket bucket = buckets.computeIfAbsent(
                key,
                ignored -> Bucket.builder()
                        .addLimit(BandwidthBuilder.builder()
                                .capacity(props.getApiPerMinute())
                                .refillGreedy(props.getApiPerMinute(), Duration.ofMinutes(1))
                                .build())
                        .build());

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            filterChain.doFilter(request, response);
            return;
        }

        long waitSeconds = Math.max(1, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
        writeProblem(response, request, waitSeconds);
    }

    private boolean shouldSkip(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        return !request.getRequestURI().startsWith("/api/");
    }

    private String rateLimitKey(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && authentication.getPrincipal() instanceof Jwt jwt) {
            String subject = jwt.getSubject();
            if (subject != null && !subject.isBlank()) {
                return "user:" + subject;
            }
        }
        return "ip:" + clientIp(request);
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return Objects.toString(request.getRemoteAddr(), "unknown");
    }

    private void writeProblem(HttpServletResponse response, HttpServletRequest request, long waitSeconds)
            throws IOException {
        ProblemDetail pd = problems.build(
                HttpStatus.TOO_MANY_REQUESTS,
                "Too many requests",
                request,
                Map.of("retryAfterSeconds", waitSeconds));

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", String.valueOf(waitSeconds));
        response.setContentType("application/problem+json");
        objectMapper.writeValue(response.getOutputStream(), pd);
    }
}
