package com.mealflow.appapi.inspiration.provider;

import java.util.List;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class MealDbClient {

    private final RestClient restClient;

    public MealDbClient(RestClient.Builder restClientBuilder, @Value("${inspiration.mealdb.base-url}") String baseUrl) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
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
}
