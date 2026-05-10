package com.mealflow.appapi.recipes.extraction.service;

import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class ExtractionLocaleResolver {

    public Resolved resolve(String localeTag) {
        String tag = localeTag == null ? "" : localeTag.trim();
        if (tag.isEmpty()) {
            return new Resolved("en", "English", "metric");
        }

        Locale locale = Locale.forLanguageTag(tag);
        String language =
                locale.getLanguage() == null ? "" : locale.getLanguage().toLowerCase(Locale.ROOT);

        if (language.startsWith("sv")) {
            return new Resolved("sv", "Swedish", "metric");
        }
        // Default to English for everything else; we keep metric units across the app.
        return new Resolved("en", "English", "metric");
    }

    public record Resolved(String languageCode, String languageName, String unitSystem) {}
}
