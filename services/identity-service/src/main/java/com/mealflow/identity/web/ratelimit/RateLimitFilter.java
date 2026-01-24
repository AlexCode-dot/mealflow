package com.mealflow.identity.web.ratelimit;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.BandwidthBuilder;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitProperties props;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final Cache<String, Bucket> buckets;

    public RateLimitFilter(RateLimitProperties props, ObjectMapper objectMapper, Clock clock) {
        this.props = props;
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.buckets = Caffeine.newBuilder()
                .expireAfterAccess(Duration.ofMinutes(props.getBucketTtlMinutes()))
                .maximumSize(props.getMaxBuckets())
                .build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (!props.isEnabled() || shouldSkip(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        RateLimit rule = resolveRule(request);
        if (rule == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = rule.keyPrefix + ":" + clientIp(request);
        Bucket bucket = buckets.get(key, ignored -> Bucket.builder()
                .addLimit(BandwidthBuilder.builder()
                        .capacity(rule.limit)
                        .refillGreedy(rule.limit, Duration.ofMinutes(1))
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
        return "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    private RateLimit resolveRule(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method)) {
            if ("/auth/login".equals(path)) {
                return new RateLimit("login", props.getLoginPerMinute());
            }
            if ("/auth/register".equals(path)) {
                return new RateLimit("register", props.getRegisterPerMinute());
            }
            if ("/auth/refresh".equals(path)) {
                return new RateLimit("refresh", props.getRefreshPerMinute());
            }
            if ("/auth/logout".equals(path)) {
                return new RateLimit("logout", props.getLogoutPerMinute());
            }
        }

        if ("GET".equalsIgnoreCase(method) && "/.well-known/jwks.json".equals(path)) {
            return new RateLimit("jwks", props.getJwksPerMinute());
        }

        return null;
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
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, "Too many requests");
        pd.setTitle(HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase());
        pd.setProperty("path", request.getRequestURI());
        pd.setProperty("timestamp", clock.instant().toString());
        pd.setProperty("retryAfterSeconds", waitSeconds);

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", String.valueOf(waitSeconds));
        response.setContentType("application/problem+json");
        objectMapper.writeValue(response.getOutputStream(), pd);
    }

    private record RateLimit(String keyPrefix, int limit) {}
}
