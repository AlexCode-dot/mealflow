package com.mealflow.appapi.monitoring;

import io.sentry.Sentry;
import io.sentry.SentryLevel;

public final class ExternalApiReporter {

    private ExternalApiReporter() {}

    public static void captureFailure(String api, String operation, Exception ex) {
        Sentry.captureException(ex, scope -> {
            scope.setLevel(SentryLevel.ERROR);
            scope.setTag("external_api", api);
            scope.setTag("external_operation", operation);
        });
    }
}
