package com.mealflow.appapi.integrations.v1;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

@TestPropertySource(
        properties = {
            "app.ratelimit.enabled=true",
            "app.ratelimit.integrations-per-minute=2",
            "app.ratelimit.api-per-minute=100"
        })
class IntegrationRateLimitIT extends IntegrationApiTestBase {

    @Test
    void integrations_areLimitedPerUserAndClient_separatelyFromApi() throws Exception {
        String a = token("rl-a", ALL_SCOPES);
        assertThat(get("/integrations/v1/recipes", a).statusCode(), is(200));
        assertThat(get("/integrations/v1/recipes", a).statusCode(), is(200));
        var blocked = get("/integrations/v1/recipes", a);
        assertThat(blocked.statusCode(), is(429));
        assertThat(blocked.headers().firstValue("Retry-After").isPresent(), is(true));

        // Other user is unaffected; first-party API for the same user uses its own budget.
        String b = token("rl-b", ALL_SCOPES);
        assertThat(get("/integrations/v1/recipes", b).statusCode(), is(200));
        assertThat(get("/api/recipes", firstPartyToken("rl-a")).statusCode(), is(200));
    }
}
