package com.mealflow.appapi.recipes.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.match.MockRestRequestMatchers;
import org.springframework.web.client.RestClient;

class PexelsClientTest {

    private static final String BASE_URL = "https://api.pexels.com";

    private record Fixture(PexelsClient client, MockRestServiceServer server) {}

    private Fixture clientWithKey(String apiKey) {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        return new Fixture(new PexelsClient(builder.build(), apiKey), server);
    }

    @Test
    void returnsTheLargeRenditionOfTheFirstPhoto() {
        Fixture f = clientWithKey("test-key");
        f.server()
                .expect(requestTo(org.hamcrest.Matchers.startsWith(BASE_URL + "/v1/search")))
                .andExpect(queryParam("query", "creamy%20chicken%20skillet"))
                .andExpect(queryParam("per_page", "1"))
                .andExpect(queryParam("orientation", "landscape"))
                .andExpect(header("Authorization", "test-key"))
                .andRespond(withSuccess("""
                        {"photos":[{"src":{"large":"https://images.pexels.com/photos/1/large.jpg",
                                           "medium":"https://images.pexels.com/photos/1/medium.jpg"}}]}
                        """, MediaType.APPLICATION_JSON));

        assertThat(f.client().findPhotoUrl("creamy chicken skillet"))
                .isEqualTo("https://images.pexels.com/photos/1/large.jpg");
        f.server().verify();
    }

    @Test
    void fallsBackToMediumWhenLargeIsMissing() {
        Fixture f = clientWithKey("test-key");
        f.server().expect(MockRestRequestMatchers.anything()).andRespond(withSuccess("""
                        {"photos":[{"src":{"medium":"https://images.pexels.com/photos/2/medium.jpg"}}]}
                        """, MediaType.APPLICATION_JSON));

        assertThat(f.client().findPhotoUrl("pancakes")).isEqualTo("https://images.pexels.com/photos/2/medium.jpg");
    }

    @Test
    void returnsNullWhenNothingMatches() {
        Fixture f = clientWithKey("test-key");
        f.server()
                .expect(MockRestRequestMatchers.anything())
                .andRespond(withSuccess("{\"photos\":[]}", MediaType.APPLICATION_JSON));

        assertThat(f.client().findPhotoUrl("nonsense dish")).isNull();
    }

    /** A photo is a nice-to-have: an upstream failure must not fail the extraction. */
    @Test
    void returnsNullWhenPexelsErrors() {
        Fixture f = clientWithKey("test-key");
        f.server().expect(MockRestRequestMatchers.anything()).andRespond(withServerError());

        assertThat(f.client().findPhotoUrl("pancakes")).isNull();
    }

    @Test
    void isDisabledAndSkipsTheCallWithoutAnApiKey() {
        Fixture f = clientWithKey("");

        assertThat(f.client().isEnabled()).isFalse();
        assertThat(f.client().findPhotoUrl("pancakes")).isNull();
        f.server().verify(); // no request was made
    }

    @Test
    void skipsTheCallWhenTheModelGaveNoPhotoQuery() {
        Fixture f = clientWithKey("test-key");

        assertThat(f.client().findPhotoUrl(null)).isNull();
        assertThat(f.client().findPhotoUrl("  ")).isNull();
        f.server().verify();
    }
}
