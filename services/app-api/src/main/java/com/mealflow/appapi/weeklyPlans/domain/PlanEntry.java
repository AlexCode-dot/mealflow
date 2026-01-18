package com.mealflow.appapi.weeklyPlans.domain;

import java.util.ArrayList;
import java.util.List;

public class PlanEntry {

    private String id;

    private String day;

    private String section;

    private String recipeId;

    private String customTitle;

    private List<String> items = new ArrayList<>();

    private List<String> extraItems = new ArrayList<>();

    private String notes;

    private Integer portions;

    public PlanEntry() {}

    public PlanEntry(
            String id,
            String day,
            String section,
            String recipeId,
            String customTitle,
            List<String> items,
            List<String> extraItems,
            String notes,
            Integer portions) {
        this.id = id;
        this.day = day;
        this.section = section;
        this.recipeId = recipeId;
        this.customTitle = customTitle;
        this.items = items != null ? items : new ArrayList<>();
        this.extraItems = extraItems != null ? extraItems : new ArrayList<>();
        this.notes = notes;
        this.portions = portions;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDay() {
        return day;
    }

    public void setDay(String day) {
        this.day = day;
    }

    public String getSection() {
        return section;
    }

    public void setSection(String section) {
        this.section = section;
    }

    public String getRecipeId() {
        return recipeId;
    }

    public void setRecipeId(String recipeId) {
        this.recipeId = recipeId;
    }

    public String getCustomTitle() {
        return customTitle;
    }

    public void setCustomTitle(String customTitle) {
        this.customTitle = customTitle;
    }

    public List<String> getItems() {
        return items;
    }

    public void setItems(List<String> items) {
        this.items = items;
    }

    public List<String> getExtraItems() {
        return extraItems;
    }

    public void setExtraItems(List<String> extraItems) {
        this.extraItems = extraItems;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Integer getPortions() {
        return portions;
    }

    public void setPortions(Integer portions) {
        this.portions = portions;
    }
}
