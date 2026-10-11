package com.mealflow.appapi.integrations.v1;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;

/**
 * Independent QA (MF1, 2026-10-11), gate N4: requests and guarantees taken literally from
 * {@code docs/integrations/personal-os-v1.md} / {@code personal-os-v1.openapi.yaml} — the documents
 * Personal OS's C2 connector is built from. Every test here encodes what the contract promises; a
 * failure is contract drift (fix code or contract, then this test pins it). Also N3: unsupported
 * method / media type must be a closed 4xx, not a 500.
 */
class QaMf1ContractConformanceIT extends IntegrationApiTestBase {

    @Test
    void contractExample_mealPlanEntryWithLowercaseWeekday_isAccepted() throws Exception {
        // personal-os-v1.md: POST /meal-plans/next/entries { "day": "tuesday", "section": "Middag", ... }
        String token = token("qa-c-day", ALL_SCOPES);
        HttpResponse<String> res = post(
                "/integrations/v1/meal-plans/next/entries",
                token,
                "{\"day\":\"tuesday\",\"section\":\"Middag\",\"customTitle\":\"Linsgryta\",\"portions\":2}",
                key());
        assertThat(res.body(), res.statusCode(), is(201));
    }

    @Test
    void contractLimit_ingredientNameUpTo120Chars_isAccepted() throws Exception {
        // personal-os-v1.openapi.yaml: Ingredient.name maxLength 120
        String token = token("qa-c-ingr", ALL_SCOPES);
        String name = "x".repeat(120);
        HttpResponse<String> res = post(
                "/integrations/v1/recipes",
                token,
                "{\"title\":\"Linsgryta\",\"ingredients\":[{\"name\":\"" + name
                        + "\",\"quantity\":2,\"unit\":\"dl\"}]}",
                key());
        assertThat(res.body(), res.statusCode(), is(201));
    }

    @Test
    void contractSchema_ingredientWithQuantityAndNoUnit_isAccepted() throws Exception {
        // personal-os-v1.openapi.yaml: Ingredient.quantity number|null, unit string|null (both optional)
        String token = token("qa-c-unit", ALL_SCOPES);
        HttpResponse<String> res = post(
                "/integrations/v1/recipes",
                token,
                "{\"title\":\"Ägg\",\"ingredients\":[{\"name\":\"Ägg\",\"quantity\":0}]}",
                key());
        assertThat(res.body(), res.statusCode(), is(201));
    }

    @Test
    void contractGuarantee_everyResourceResponseCarriesAnETag_includingAnEmptyWeek() throws Exception {
        // personal-os-v1.md: "Every resource response carries an ETag header"
        String token = token("qa-c-etag", ALL_SCOPES);
        HttpResponse<String> res = get("/integrations/v1/meal-plans/next", token);
        assertThat(res.statusCode(), is(200));
        assertThat(res.body(), etag(res), notNullValue());
    }

    @Test
    void unsupportedMethod_isA405_notA500() throws Exception {
        String token = token("qa-c-405", ALL_SCOPES);
        HttpResponse<String> res = send("/integrations/v1/recipes", token, "PUT", "{\"title\":\"x\"}", key(), null);
        assertThat(res.body(), res.statusCode(), is(405));
    }

    @Test
    void unsupportedMediaType_isA415_notA500() throws Exception {
        String token = token("qa-c-415", ALL_SCOPES);
        HttpResponse<String> res = http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/integrations/v1/recipes"))
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", key())
                        .header("Content-Type", "text/plain")
                        .POST(HttpRequest.BodyPublishers.ofString("title=x"))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(res.body(), res.statusCode(), is(415));
    }
}
