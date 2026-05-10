package com.mealflow.appapi.recipes.extraction.domain;

import java.util.ArrayList;
import java.util.List;

public class RecipeDraft {

    private String title;
    private String description;
    private List<DraftIngredient> ingredients = new ArrayList<>();
    private List<String> steps = new ArrayList<>();
    private Integer cookingTimeMinutes;
    private Integer portions;
    private String category;
    private String language;
    private List<String> uncertainFields = new ArrayList<>();

    public RecipeDraft() {}

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<DraftIngredient> getIngredients() {
        return ingredients;
    }

    public void setIngredients(List<DraftIngredient> ingredients) {
        this.ingredients = ingredients != null ? ingredients : new ArrayList<>();
    }

    public List<String> getSteps() {
        return steps;
    }

    public void setSteps(List<String> steps) {
        this.steps = steps != null ? steps : new ArrayList<>();
    }

    public Integer getCookingTimeMinutes() {
        return cookingTimeMinutes;
    }

    public void setCookingTimeMinutes(Integer cookingTimeMinutes) {
        this.cookingTimeMinutes = cookingTimeMinutes;
    }

    public Integer getPortions() {
        return portions;
    }

    public void setPortions(Integer portions) {
        this.portions = portions;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public List<String> getUncertainFields() {
        return uncertainFields;
    }

    public void setUncertainFields(List<String> uncertainFields) {
        this.uncertainFields = uncertainFields != null ? uncertainFields : new ArrayList<>();
    }

    public static class DraftIngredient {
        private String name;
        private Double quantity;
        private String unit;

        public DraftIngredient() {}

        public DraftIngredient(String name, Double quantity, String unit) {
            this.name = name;
            this.quantity = quantity;
            this.unit = unit;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public Double getQuantity() {
            return quantity;
        }

        public void setQuantity(Double quantity) {
            this.quantity = quantity;
        }

        public String getUnit() {
            return unit;
        }

        public void setUnit(String unit) {
            this.unit = unit;
        }
    }
}
