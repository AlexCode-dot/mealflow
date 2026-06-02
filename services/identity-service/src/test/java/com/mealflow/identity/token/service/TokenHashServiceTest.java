package com.mealflow.identity.token.service;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.not;

import org.junit.jupiter.api.Test;

class TokenHashServiceTest {

    private final TokenHashService service = new TokenHashService();

    @Test
    void sha256_isLowercaseHex() {
        String hash = service.sha256("hello");
        assertThat(hash, matchesPattern("^[0-9a-f]{64}$"));
    }

    @Test
    void sha256_matchesKnownVector() {
        // sha256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
        String hash = service.sha256("abc");
        assertThat(hash, is("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));
    }

    @Test
    void sha256_isDeterministic() {
        assertThat(service.sha256("mfi_dev_abc"), is(service.sha256("mfi_dev_abc")));
    }

    @Test
    void sha256_differsByInput() {
        assertThat(service.sha256("a"), not(is(service.sha256("b"))));
    }
}
