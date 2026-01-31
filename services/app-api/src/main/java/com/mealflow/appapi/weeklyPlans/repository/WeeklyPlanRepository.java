package com.mealflow.appapi.weeklyPlans.repository;

import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WeeklyPlanRepository extends MongoRepository<WeeklyPlan, String> {

    List<WeeklyPlan> findAllByUserIdOrderByWeeklyStartDesc(String userId);

    List<WeeklyPlan> findAllByUserIdAndWeeklyStart(String userId, String weeklyStart);

    boolean existsByUserIdAndWeeklyStart(String userId, String weeklyStart);

    Optional<WeeklyPlan> findByIdAndUserId(String id, String userId);

    long deleteByIdAndUserId(String id, String userId);

    long deleteByUserId(String userId);
}
