package com.mealflow.appapi.weeklyPlans.service;

public class WeeklyPlanNotFoundException extends RuntimeException {

  public WeeklyPlanNotFoundException(String message) {
    super(message);
  }
}
