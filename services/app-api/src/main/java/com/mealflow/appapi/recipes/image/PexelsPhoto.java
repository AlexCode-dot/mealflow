package com.mealflow.appapi.recipes.image;

/**
 * A single Pexels search hit, reduced to what we store: the hosted image plus the credit data
 * Pexels' API terms ask us to show (photographer and a link back to the photo's Pexels page).
 */
public record PexelsPhoto(String imageUrl, String photographer, String photographerUrl, String pageUrl) {}
