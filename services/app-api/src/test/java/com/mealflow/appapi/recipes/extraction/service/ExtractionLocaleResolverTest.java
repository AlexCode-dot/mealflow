package com.mealflow.appapi.recipes.extraction.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ExtractionLocaleResolverTest {

    private final ExtractionLocaleResolver resolver = new ExtractionLocaleResolver();

    @Test
    void resolvesSwedishLocale() {
        ExtractionLocaleResolver.Resolved r = resolver.resolve("sv-SE");
        assertThat(r.languageCode()).isEqualTo("sv");
        assertThat(r.languageName()).isEqualTo("Swedish");
        assertThat(r.unitSystem()).isEqualTo("metric");
    }

    @Test
    void resolvesPlainSwedish() {
        ExtractionLocaleResolver.Resolved r = resolver.resolve("sv");
        assertThat(r.languageCode()).isEqualTo("sv");
    }

    @Test
    void defaultsToEnglishMetric() {
        ExtractionLocaleResolver.Resolved r = resolver.resolve("en-US");
        assertThat(r.languageCode()).isEqualTo("en");
        assertThat(r.languageName()).isEqualTo("English");
        assertThat(r.unitSystem()).isEqualTo("metric");
    }

    @Test
    void nullLocaleFallsBackToEnglish() {
        ExtractionLocaleResolver.Resolved r = resolver.resolve(null);
        assertThat(r.languageCode()).isEqualTo("en");
    }

    @Test
    void blankLocaleFallsBackToEnglish() {
        ExtractionLocaleResolver.Resolved r = resolver.resolve("   ");
        assertThat(r.languageCode()).isEqualTo("en");
    }
}
