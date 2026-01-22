package com.mealflow.appapi.shoppingLists.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "shopping_lists")
public class ShoppingList {

    @Id
    private String id;

    @Indexed
    private String userId;

    private ShoppingListStatus status;

    private String weeklyPlanId;

    private String title;

    private List<ShoppingListItem> items = new ArrayList<>();

    private Instant createdAt;

    private Instant updatedAt;

    public ShoppingList() {}

    public ShoppingList(
            String id,
            String userId,
            ShoppingListStatus status,
            String weeklyPlanId,
            String title,
            List<ShoppingListItem> items,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.userId = userId;
        this.status = status;
        this.weeklyPlanId = weeklyPlanId;
        this.title = title;
        this.items = items != null ? items : new ArrayList<>();
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public ShoppingList(
            String userId,
            ShoppingListStatus status,
            String weeklyPlanId,
            String title,
            List<ShoppingListItem> items,
            Instant createdAt,
            Instant updatedAt) {
        this(null, userId, status, weeklyPlanId, title, items, createdAt, updatedAt);
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public ShoppingListStatus getStatus() {
        return status;
    }

    public void setStatus(ShoppingListStatus status) {
        this.status = status;
    }

    public String getWeeklyPlanId() {
        return weeklyPlanId;
    }

    public void setWeeklyPlanId(String weeklyPlanId) {
        this.weeklyPlanId = weeklyPlanId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public List<ShoppingListItem> getItems() {
        return items;
    }

    public void setItems(List<ShoppingListItem> items) {
        this.items = items != null ? items : new ArrayList<>();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
