package com.mealflow.appapi.weeklyPlans.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "weekly_plans")
public class WeeklyPlan {

  @Id
  private String id;

  private String userId;

  private String weeklyStart;

  private List<PlanEntry> entries = new ArrayList<>();

  private Instant createdAt;

  private Instant updatedAt;

  public WeeklyPlan() {}

  public WeeklyPlan(
      String id,
      String userId,
      String weeklyStart,
      List<PlanEntry> entries,
      Instant createdAt,
      Instant updatedAt) {

    this.id = id;
    this.userId = userId;
    this.weeklyStart = weeklyStart;
    this.entries = entries != null ? entries : new ArrayList<>();
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public WeeklyPlan(
      String userId,
      String weeklyStart,
      List<PlanEntry> entries,
      Instant createdAt,
      Instant updatedAt) {
    this(null, userId, weeklyStart, entries, createdAt, updatedAt);
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

  public void applyPatch(String weeklyStart, List<PlanEntry> entries, Instant updatedAt) {
    if (weeklyStart != null) {
      this.weeklyStart = weeklyStart;
    }
    if (entries != null) {
      this.entries = entries;
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
