package com.mealflow.appapi.recipes.image;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** The slice of the Pexels search response we care about: the photos and their hosted sizes. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PexelsPhotoResponse(List<Photo> photos) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Photo(Source src) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Source(
            @JsonProperty("large") String large,
            @JsonProperty("medium") String medium) {

        /** Prefer the larger rendition; fall back to medium when Pexels omits it. */
        public String best() {
            if (large != null && !large.isBlank()) {
                return large;
            }
            return medium != null && !medium.isBlank() ? medium : null;
        }
    }
}
