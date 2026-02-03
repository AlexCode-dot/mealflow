package com.mealflow.appapi.recipes.image;

import java.time.LocalDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("recipe_image_quotas")
public class RecipeImageQuota {

    @Id
    private String id;

    private String userId;
    private LocalDate date;
    private int count;

    public RecipeImageQuota() {}

    public RecipeImageQuota(String userId, LocalDate date, int count) {
        this.userId = userId;
        this.date = date;
        this.count = count;
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }
}
