package com.mealflow.appapi.weeklyPlans.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "weekly_plans")
public class WeeklyPlan {

    @Id
    private String id;

    private String userId;

    private String weeklyStart;

    private List<PlanEntry> entries = new ArrayList<>();

    private List<String> sections = new ArrayList<>();

    private Instant createdAt;

    private Instant updatedAt;

    public WeeklyPlan() {}

    public WeeklyPlan(
            String id,
            String userId,
            String weeklyStart,
            List<PlanEntry> entries,
            List<String> sections,
            Instant createdAt,
            Instant updatedAt) {

        this.id = id;
        this.userId = userId;
        this.weeklyStart = weeklyStart;
        this.entries = entries != null ? entries : new ArrayList<>();
        this.sections = sections != null ? sections : new ArrayList<>();
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public WeeklyPlan(
            String userId,
            String weeklyStart,
            List<PlanEntry> entries,
            List<String> sections,
            Instant createdAt,
            Instant updatedAt) {
        this(null, userId, weeklyStart, entries, sections, createdAt, updatedAt);
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

    public String getWeeklyStart() {
        return weeklyStart;
    }

    public void setWeeklyStart(String weeklyStart) {
        this.weeklyStart = weeklyStart;
    }

    public List<PlanEntry> getEntries() {
        return entries;
    }

    public void setEntries(List<PlanEntry> entries) {
        this.entries = entries;
    }

    public List<String> getSections() {
        return sections;
    }

    public void setSections(List<String> sections) {
        this.sections = sections != null ? sections : new ArrayList<>();
    }

    public void applyPatch(String weeklyStart, List<PlanEntry> entries, List<String> sections, Instant updatedAt) {
        if (weeklyStart != null) {
            this.weeklyStart = weeklyStart;
        }
        if (entries != null) {
            this.entries = entries;
        }
        if (sections != null) {
            this.sections = sections;
        }
        this.updatedAt = updatedAt;
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
