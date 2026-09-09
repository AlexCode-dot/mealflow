package com.mealflow.appapi.recipes.domain;

/**
 * Credit for a stock photo (today always Pexels): who took it and where it lives, so the app can
 * render the "Foto: {photographer} · Pexels" caption the provider's terms require. Embedded in
 * both the extraction job (as thumbnailAttribution) and the recipe (as imageAttribution); absent
 * for the user's own uploads.
 */
public class ImageAttribution {

    private String provider;
    private String photographer;
    private String photographerUrl;
    private String sourceUrl;

    public ImageAttribution() {}

    public ImageAttribution(String provider, String photographer, String photographerUrl, String sourceUrl) {
        this.provider = provider;
        this.photographer = photographer;
        this.photographerUrl = photographerUrl;
        this.sourceUrl = sourceUrl;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getPhotographer() {
        return photographer;
    }

    public void setPhotographer(String photographer) {
        this.photographer = photographer;
    }

    public String getPhotographerUrl() {
        return photographerUrl;
    }

    public void setPhotographerUrl(String photographerUrl) {
        this.photographerUrl = photographerUrl;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }
}
