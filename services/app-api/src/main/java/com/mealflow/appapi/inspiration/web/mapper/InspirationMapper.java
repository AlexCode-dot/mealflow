package com.mealflow.appapi.inspiration.web.mapper;

import com.mealflow.appapi.inspiration.provider.MealDbMeal;
import com.mealflow.appapi.inspiration.web.dto.InspirationIngredientResponse;
import com.mealflow.appapi.inspiration.web.dto.InspirationListItemResponse;
import com.mealflow.appapi.inspiration.web.dto.InspirationRecipeResponse;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class InspirationMapper {

    public InspirationListItemResponse toListItem(MealDbMeal meal) {
        Integer ingredientCount = countIngredients(meal);
        return new InspirationListItemResponse(
                meal.id(), meal.title(), meal.imageUrl(), meal.category(), meal.area(), ingredientCount);
    }

    public InspirationRecipeResponse toResponse(MealDbMeal meal) {
        return new InspirationRecipeResponse(
                meal.id(),
                meal.title(),
                meal.imageUrl(),
                meal.category(),
                meal.area(),
                toIngredients(meal),
                toSteps(meal.instructions()));
    }

    private List<InspirationIngredientResponse> toIngredients(MealDbMeal meal) {
        List<String> names = List.of(
                meal.ingredient1(),
                meal.ingredient2(),
                meal.ingredient3(),
                meal.ingredient4(),
                meal.ingredient5(),
                meal.ingredient6(),
                meal.ingredient7(),
                meal.ingredient8(),
                meal.ingredient9(),
                meal.ingredient10(),
                meal.ingredient11(),
                meal.ingredient12(),
                meal.ingredient13(),
                meal.ingredient14(),
                meal.ingredient15(),
                meal.ingredient16(),
                meal.ingredient17(),
                meal.ingredient18(),
                meal.ingredient19(),
                meal.ingredient20());

        List<String> measures = List.of(
                meal.measure1(),
                meal.measure2(),
                meal.measure3(),
                meal.measure4(),
                meal.measure5(),
                meal.measure6(),
                meal.measure7(),
                meal.measure8(),
                meal.measure9(),
                meal.measure10(),
                meal.measure11(),
                meal.measure12(),
                meal.measure13(),
                meal.measure14(),
                meal.measure15(),
                meal.measure16(),
                meal.measure17(),
                meal.measure18(),
                meal.measure19(),
                meal.measure20());

        List<InspirationIngredientResponse> result = new ArrayList<>();
        for (int i = 0; i < names.size(); i++) {
            String name = trimToNull(names.get(i));
            if (name == null) {
                continue;
            }
            String measure = trimToNull(measures.get(i));
            result.add(new InspirationIngredientResponse(name, measure));
        }
        return result;
    }

    private Integer countIngredients(MealDbMeal meal) {
        List<String> names = List.of(
                meal.ingredient1(),
                meal.ingredient2(),
                meal.ingredient3(),
                meal.ingredient4(),
                meal.ingredient5(),
                meal.ingredient6(),
                meal.ingredient7(),
                meal.ingredient8(),
                meal.ingredient9(),
                meal.ingredient10(),
                meal.ingredient11(),
                meal.ingredient12(),
                meal.ingredient13(),
                meal.ingredient14(),
                meal.ingredient15(),
                meal.ingredient16(),
                meal.ingredient17(),
                meal.ingredient18(),
                meal.ingredient19(),
                meal.ingredient20());

        int count = 0;
        for (String name : names) {
            if (trimToNull(name) != null) {
                count += 1;
            }
        }
        return count > 0 ? count : null;
    }

    private List<String> toSteps(String instructions) {
        String text = trimToNull(instructions);
        if (text == null) {
            return List.of();
        }
        List<String> steps = new ArrayList<>();
        for (String line : text.split("\\r?\\n")) {
            String trimmed = trimToNull(line);
            if (trimmed == null || isStepMarker(trimmed)) {
                continue;
            }
            steps.add(trimmed);
        }
        if (!steps.isEmpty()) {
            return steps;
        }
        return List.of(text);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isStepMarker(String value) {
        return value.matches("(?i)^(step\\s*\\d+|\\d+[\\).:]?)$");
    }
}
