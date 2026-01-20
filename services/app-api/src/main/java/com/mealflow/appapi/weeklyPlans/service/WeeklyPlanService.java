package com.mealflow.appapi.weeklyPlans.service;

import com.mealflow.appapi.recipes.repository.RecipeRepository;
import com.mealflow.appapi.weeklyPlans.domain.PlanEntry;
import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import com.mealflow.appapi.weeklyPlans.repository.WeeklyPlanRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class WeeklyPlanService {

    private final WeeklyPlanRepository weeklyPlanRepository;
    private final RecipeRepository recipeRepository;
    private final Clock clock;
    private static final Set<String> WEEK_DAYS =
            new HashSet<>(Arrays.asList("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"));
    private static final List<String> DEFAULT_SECTIONS = List.of("Breakfast", "Lunch", "Dinner");

    public WeeklyPlanService(
            WeeklyPlanRepository weeklyPlanRepository, RecipeRepository recipeRepository, Clock clock) {
        this.weeklyPlanRepository = weeklyPlanRepository;
        this.recipeRepository = recipeRepository;
        this.clock = clock;
    }

    public List<WeeklyPlan> listForUser(String userId, String weeklyStart) {
        if (weeklyStart == null) {
            return weeklyPlanRepository.findAllByUserIdOrderByWeeklyStartDesc(userId);
        }
        String normalizedWeeklyStart = normalizeWeeklyStart(weeklyStart);
        return weeklyPlanRepository.findAllByUserIdAndWeeklyStart(userId, normalizedWeeklyStart);
    }

    public WeeklyPlan getForUser(String userId, String planId) {
        return weeklyPlanRepository
                .findByIdAndUserId(planId, userId)
                .orElseThrow(() -> new WeeklyPlanNotFoundException("Weekly plan not found"));
    }

    public WeeklyPlan create(String userId, String weeklyStart, List<String> sections, List<PlanEntry> entries) {
        String normalizedWeeklyStart = normalizeWeeklyStart(weeklyStart);
        List<PlanEntry> normalizedEntries = normalizeEntries(entries);
        List<String> normalizedSections = normalizeSections(
                sections, sections == null || sections.isEmpty() ? normalizedEntries : null, DEFAULT_SECTIONS);
        validateEntries(normalizedEntries, userId, normalizedSections);

        Instant now = clock.instant();
        WeeklyPlan plan =
                new WeeklyPlan(userId, normalizedWeeklyStart, normalizedEntries, normalizedSections, now, now);
        return weeklyPlanRepository.save(plan);
    }

    public WeeklyPlan patch(
            String userId, String planId, String weeklyStart, List<String> sections, List<PlanEntry> entries) {
        WeeklyPlan existing = getForUser(userId, planId);

        String normalizedWeeklyStart = weeklyStart == null ? null : normalizeWeeklyStart(weeklyStart);
        List<PlanEntry> normalizedEntries = entries == null ? null : normalizeEntries(entries);
        List<String> normalizedSections = sections == null ? null : normalizeSections(sections, null, DEFAULT_SECTIONS);

        if (normalizedEntries != null) {
            List<String> sectionsForValidation =
                    normalizedSections == null ? existing.getSections() : normalizedSections;
            validateEntries(normalizedEntries, userId, sectionsForValidation);
        }

        existing.applyPatch(normalizedWeeklyStart, normalizedEntries, normalizedSections, clock.instant());
        return weeklyPlanRepository.save(existing);
    }

    public WeeklyPlan replace(
            String userId, String planId, String weeklyStart, List<String> sections, List<PlanEntry> entries) {
        WeeklyPlan existing = getForUser(userId, planId);
        String normalizedWeeklyStart = normalizeWeeklyStart(weeklyStart);
        List<PlanEntry> normalizedEntries = normalizeEntries(entries);
        List<String> normalizedSections = normalizeSections(
                sections, sections == null || sections.isEmpty() ? normalizedEntries : null, DEFAULT_SECTIONS);
        validateEntries(normalizedEntries, userId, normalizedSections);

        existing.setWeeklyStart(normalizedWeeklyStart);
        existing.setEntries(normalizedEntries);
        existing.setSections(normalizedSections);
        existing.setUpdatedAt(clock.instant());
        return weeklyPlanRepository.save(existing);
    }

    public void delete(String userId, String planId) {
        long deleted = weeklyPlanRepository.deleteByIdAndUserId(planId, userId);
        if (deleted == 0) {
            throw new WeeklyPlanNotFoundException("Weekly plan not found");
        }
    }

    private String normalizeWeeklyStart(String weeklyStart) {
        if (weeklyStart == null || weeklyStart.isBlank()) {
            throw new WeeklyPlanValidationException("weeklyStart must not be blank");
        }
        String trimmed = weeklyStart.trim();
        try {
            LocalDate.parse(trimmed);
        } catch (DateTimeParseException ex) {
            throw new WeeklyPlanValidationException("weeklyStart must be a valid ISO date");
        }
        return trimmed;
    }

    private List<PlanEntry> normalizeEntries(List<PlanEntry> entries) {
        if (entries == null) {
            return List.of();
        }

        return entries.stream()
                .map(entry -> {
                    String id = entry.getId();
                    if (id == null || id.isBlank()) {
                        entry.setId(UUID.randomUUID().toString());
                    }
                    return entry;
                })
                .toList();
    }

    private List<String> normalizeSections(List<String> sections, List<PlanEntry> entries, List<String> fallback) {
        if (sections != null) {
            for (String section : sections) {
                if (section == null || section.isBlank()) {
                    throw new WeeklyPlanValidationException("sections must not be blank");
                }
            }
        }

        List<String> source = (sections == null || sections.isEmpty()) ? fallback : sections;
        Map<String, String> normalized = new LinkedHashMap<>();
        for (String section : source) {
            String trimmed = section == null ? "" : section.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            normalized.putIfAbsent(trimmed.toLowerCase(Locale.ROOT), trimmed);
        }

        if (normalized.isEmpty() && fallback != null && !fallback.isEmpty()) {
            for (String section : fallback) {
                String trimmed = section.trim();
                normalized.putIfAbsent(trimmed.toLowerCase(Locale.ROOT), trimmed);
            }
        }

        if (entries != null) {
            for (PlanEntry entry : entries) {
                String section = entry.getSection();
                String trimmed = section == null ? "" : section.trim();
                if (trimmed.isBlank()) {
                    continue;
                }
                normalized.putIfAbsent(trimmed.toLowerCase(Locale.ROOT), trimmed);
            }
        }

        return List.copyOf(normalized.values());
    }

    private void validateEntries(List<PlanEntry> entries, String userId, List<String> sections) {
        boolean enforceSections = sections != null && !sections.isEmpty();
        Set<String> allowedSections = sections == null
                ? Set.of()
                : sections.stream().map(s -> s.toLowerCase(Locale.ROOT)).collect(Collectors.toSet());
        for (PlanEntry entry : entries) {
            String day = entry.getDay() == null ? "" : entry.getDay().trim().toUpperCase(Locale.ROOT);
            if (!WEEK_DAYS.contains(day)) {
                throw new WeeklyPlanValidationException("day must be one of MON,TUE,WED,THU,FRI,SAT,SUN");
            }
            String section =
                    entry.getSection() == null ? "" : entry.getSection().trim();
            if (section.isBlank()) {
                throw new WeeklyPlanValidationException("section must not be blank");
            }
            if (enforceSections && !allowedSections.contains(section.toLowerCase(Locale.ROOT))) {
                throw new WeeklyPlanValidationException("section must exist in sections list");
            }
            boolean hasRecipe =
                    entry.getRecipeId() != null && !entry.getRecipeId().isBlank();
            boolean hasCustomTitle =
                    entry.getCustomTitle() != null && !entry.getCustomTitle().isBlank();
            if (!hasRecipe && !hasCustomTitle) {
                throw new WeeklyPlanValidationException("Each entry must reference a recipe or provide a custom title");
            }
            if (hasRecipe && hasCustomTitle) {
                throw new WeeklyPlanValidationException("Entries cannot have both recipeId and customTitle");
            }
        }

        Set<String> recipeIds = entries.stream()
                .map(PlanEntry::getRecipeId)
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toSet());

        if (recipeIds.isEmpty()) {
            return;
        }

        int found = recipeRepository
                .findAllByIdInAndUserId(List.copyOf(recipeIds), userId)
                .size();
        if (found != recipeIds.size()) {
            throw new WeeklyPlanValidationException("Weekly plan references recipes not owned by user");
        }
    }
}
