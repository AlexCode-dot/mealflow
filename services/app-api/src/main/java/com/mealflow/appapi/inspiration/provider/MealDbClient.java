package com.mealflow.appapi.inspiration.provider;

import java.util.List;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class MealDbClient {

    private static final Logger logger = LoggerFactory.getLogger(MealDbClient.class);
    private final RestClient restClient;

    public MealDbClient(
            RestClient.Builder restClientBuilder,
            @Value("${inspiration.mealdb.base-url}") String baseUrl,
            @Value("${inspiration.mealdb.api-key}") String apiKey) {
        String normalizedBaseUrl = normalizeBaseUrl(baseUrl, apiKey);
        this.restClient = restClientBuilder.baseUrl(normalizedBaseUrl).build();
        logger.info("MealDB client configured with base URL {}", maskMealDbBaseUrl(normalizedBaseUrl));
    }

    public List<MealDbMeal> searchByName(String query) {
        MealDbResponse response = restClient
                .get()
                .uri(uriBuilder ->
                        uriBuilder.path("/search.php").queryParam("s", query).build())
                .retrieve()
                .body(MealDbResponse.class);
        return toMeals(response);
    }

    public List<MealDbMeal> filterByIngredient(String ingredient) {
        MealDbResponse response = restClient
                .get()
                .uri(uriBuilder -> uriBuilder
                        .path("/filter.php")
                        .queryParam("i", ingredient)
                        .build())
                .retrieve()
                .body(MealDbResponse.class);
        return toMeals(response);
    }

    public List<MealDbMeal> filterByCategory(String category) {
        MealDbResponse response = restClient
                .get()
                .uri(uriBuilder ->
                        uriBuilder.path("/filter.php").queryParam("c", category).build())
                .retrieve()
                .body(MealDbResponse.class);
        return toMeals(response);
    }

    public List<MealDbMeal> filterByArea(String area) {
        MealDbResponse response = restClient
                .get()
                .uri(uriBuilder ->
                        uriBuilder.path("/filter.php").queryParam("a", area).build())
                .retrieve()
                .body(MealDbResponse.class);
        return toMeals(response);
    }

    public MealDbMeal lookupById(String id) {
        MealDbResponse response = restClient
                .get()
                .uri(uriBuilder ->
                        uriBuilder.path("/lookup.php").queryParam("i", id).build())
                .retrieve()
                .body(MealDbResponse.class);
        return toMeals(response).stream().findFirst().orElse(null);
    }

    public MealDbMeal random() {
        MealDbResponse response = restClient.get().uri("/random.php").retrieve().body(MealDbResponse.class);
        return toMeals(response).stream().findFirst().orElse(null);
    }

    public List<MealDbMeal> randomSelection() {
        MealDbResponse response =
                restClient.get().uri("/randomselection.php").retrieve().body(MealDbResponse.class);
        return toMeals(response);
    }

    public List<MealDbMeal> latest() {
        MealDbResponse response = restClient.get().uri("/latest.php").retrieve().body(MealDbResponse.class);
        return toMeals(response);
    }

    private List<MealDbMeal> toMeals(MealDbResponse response) {
        if (response == null || response.meals() == null) {
            return List.of();
        }
        return response.meals().stream()
                .filter(Objects::nonNull)
                .filter(meal -> meal.id() != null && !meal.id().isBlank())
                .filter(meal -> meal.title() != null && !meal.title().isBlank())
                .toList();
    }

    private static String normalizeBaseUrl(String baseUrl, String apiKey) {
        String trimmedBaseUrl = baseUrl == null ? "" : baseUrl.trim();
        if (trimmedBaseUrl.isBlank()) {
            throw new IllegalArgumentException("MealDB base URL is required");
        }
        String trimmedApiKey = apiKey == null ? "" : apiKey.trim();
        if (trimmedApiKey.isBlank()) {
            throw new IllegalArgumentException("MealDB API key is required");
        }
        String normalizedBaseUrl = trimmedBaseUrl.endsWith("/") ? trimmedBaseUrl : trimmedBaseUrl + "/";
        return normalizedBaseUrl + trimmedApiKey;
    }

    private static String maskMealDbBaseUrl(String baseUrl) {
        int lastSlash = baseUrl.lastIndexOf('/');
        if (lastSlash <= 0) {
            return "<invalid>";
        }
        return baseUrl.substring(0, lastSlash + 1) + "***";
    }
}
