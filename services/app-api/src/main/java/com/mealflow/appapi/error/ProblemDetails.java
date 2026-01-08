package com.mealflow.appapi.error;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Component;

@Component
public class ProblemDetails {

    private final Clock clock;

    public ProblemDetails(Clock clock) {
        this.clock = clock;
    }

    public ProblemDetail build(HttpStatus status, String detail, HttpServletRequest req) {
        return build(status, detail, req, null);
    }

    public ProblemDetail build(HttpStatus status, String detail, HttpServletRequest req, Map<String, Object> extras) {

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setTitle(status.getReasonPhrase());
        pd.setProperty("path", req.getRequestURI());
        pd.setProperty("timestamp", clock.instant().toString());

        if (extras != null) {
            extras.forEach(pd::setProperty);
        }

        return pd;
    }
}
