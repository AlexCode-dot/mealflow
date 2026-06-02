package com.mealflow.identity.admin.web.dto;

import java.time.Instant;

/**
 * Matches {@code AdminStats}. Fields that mealflow can't yet compute are sent
 * as null so the panel renders "—".
 */
public record AdminStatsResponse(
        long totalUsers,
        long activeUsers,
        long signupsToday,
        long signupsThisWeek,
        Long dau,
        Long wau,
        Long mrrCents,
        Instant generatedAt) {}
