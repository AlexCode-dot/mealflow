package com.mealflow.appapi.integrations.v1;

import org.springframework.http.HttpStatus;

/** Error raised by the integration API; rendered as problem+json with the given status. */
public class IntegrationApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public IntegrationApiException(HttpStatus status, String detail) {
        this(status, detail, null);
    }

    /** {@code code} is a stable machine-readable reason, added to the problem as {@code "code"}. */
    public IntegrationApiException(HttpStatus status, String detail, String code) {
        super(detail);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    /** Machine-readable reason, or null when the status says it all. */
    public String getCode() {
        return code;
    }

    public static IntegrationApiException badRequest(String detail) {
        return new IntegrationApiException(HttpStatus.BAD_REQUEST, detail);
    }

    public static IntegrationApiException notFound(String detail) {
        return new IntegrationApiException(HttpStatus.NOT_FOUND, detail);
    }

    public static IntegrationApiException forbidden(String detail) {
        return new IntegrationApiException(HttpStatus.FORBIDDEN, detail);
    }

    public static IntegrationApiException unprocessable(String detail, String code) {
        return new IntegrationApiException(HttpStatus.UNPROCESSABLE_CONTENT, detail, code);
    }

    public static IntegrationApiException preconditionFailed() {
        return new IntegrationApiException(
                HttpStatus.PRECONDITION_FAILED, "Resource has changed; fetch the latest version and retry");
    }
}
