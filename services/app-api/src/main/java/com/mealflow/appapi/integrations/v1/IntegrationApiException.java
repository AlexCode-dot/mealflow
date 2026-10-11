package com.mealflow.appapi.integrations.v1;

import org.springframework.http.HttpStatus;

/** Error raised by the integration API; rendered as problem+json with the given status. */
public class IntegrationApiException extends RuntimeException {

    private final HttpStatus status;

    public IntegrationApiException(HttpStatus status, String detail) {
        super(detail);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static IntegrationApiException badRequest(String detail) {
        return new IntegrationApiException(HttpStatus.BAD_REQUEST, detail);
    }

    public static IntegrationApiException notFound(String detail) {
        return new IntegrationApiException(HttpStatus.NOT_FOUND, detail);
    }

    public static IntegrationApiException preconditionFailed() {
        return new IntegrationApiException(
                HttpStatus.PRECONDITION_FAILED, "Resource has changed; fetch the latest version and retry");
    }
}
