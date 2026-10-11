package com.mealflow.appapi.integrations.v1;

import com.mealflow.appapi.integrations.v1.dto.AddMealPlanEntryBody;
import com.mealflow.appapi.integrations.v1.dto.MealPlanDto;
import com.mealflow.appapi.integrations.v1.dto.MealPlanEntryDto;
import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.repository.RecipeRepository;
import com.mealflow.appapi.weeklyPlans.domain.PlanEntry;
import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import com.mealflow.appapi.weeklyPlans.repository.WeeklyPlanRepository;
import com.mealflow.appapi.weeklyPlans.service.WeeklyPlanNotFoundException;
import com.mealflow.appapi.weeklyPlans.service.WeeklyPlanService;
import com.mealflow.appapi.weeklyPlans.service.WeeklyPlanValidationException;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/**
 * Meal plan operations for the integration API. Weeks start on Monday; {@code weeklyStart} is the
 * Monday as an ISO date (same convention as the app). "current" / "next" are resolved in the
 * configured time zone (default Europe/Stockholm) using the injected {@link Clock}.
 */
@Service
public class IntegrationMealPlanService {

    static final List<String> DEFAULT_SECTIONS = List.of("Breakfast", "Lunch", "Dinner");
    private static final Set<String> DAYS = Set.of("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN");

    private final WeeklyPlanRepository plans;
    private final WeeklyPlanService weeklyPlanService;
    private final RecipeRepository recipes;
    private final MongoTemplate mongo;
    private final Clock clock;
    private final ZoneId zone;

    public IntegrationMealPlanService(
            WeeklyPlanRepository plans,
            WeeklyPlanService weeklyPlanService,
            RecipeRepository recipes,
            MongoTemplate mongo,
            Clock clock,
            @Value("${integrations.timezone:Europe/Stockholm}") String zone) {
        this.plans = plans;
        this.weeklyPlanService = weeklyPlanService;
        this.recipes = recipes;
        this.mongo = mongo;
        this.clock = clock;
        this.zone = ZoneId.of(zone);
    }

    public String weekStart(String week) {
        LocalDate monday = LocalDate.now(clock.withZone(zone)).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return switch (week == null ? "" : week.trim().toLowerCase(Locale.ROOT)) {
            case "current" -> monday.toString();
            case "next" -> monday.plusWeeks(1).toString();
            default -> throw IntegrationApiException.notFound("Unknown week; use 'current' or 'next'");
        };
    }

    /** The plan for the week, or null if the user has none yet. */
    public WeeklyPlan find(String userId, String weekStart) {
        return plans.findAllByUserIdAndWeeklyStart(userId, weekStart).stream()
                .findFirst()
                .orElse(null);
    }

    public record AddedEntry(WeeklyPlan plan, String entryId) {}

    public AddedEntry addEntry(String userId, String week, AddMealPlanEntryBody body, String ifMatch) {
        String weekStart = weekStart(week);
        String day = body.day().trim().toUpperCase(Locale.ROOT);
        if (!DAYS.contains(day)) {
            throw IntegrationApiException.badRequest("day must be one of MON,TUE,WED,THU,FRI,SAT,SUN");
        }
        boolean hasRecipe = body.recipeId() != null && !body.recipeId().isBlank();
        boolean hasCustom = body.customTitle() != null && !body.customTitle().isBlank();
        if (hasRecipe == hasCustom) {
            throw IntegrationApiException.badRequest("Provide exactly one of recipeId or customTitle");
        }
        if (hasRecipe
                && recipes.findByIdAndUserId(body.recipeId().trim(), userId).isEmpty()) {
            // Same message whether the recipe doesn't exist or belongs to someone else.
            throw IntegrationApiException.badRequest("recipeId must reference one of your recipes");
        }

        String entryId = UUID.randomUUID().toString();
        WeeklyPlan existing = find(userId, weekStart);
        if (existing == null) {
            if (ifMatch != null && !ifMatch.isBlank()) {
                throw IntegrationApiException.preconditionFailed();
            }
            PlanEntry entry = newEntry(entryId, day, body.section().trim(), body, hasRecipe);
            try {
                WeeklyPlan created = weeklyPlanService.create(userId, weekStart, null, List.of(entry));
                return new AddedEntry(created, entryId);
            } catch (WeeklyPlanValidationException raced) {
                existing = find(userId, weekStart);
                if (existing == null) {
                    throw raced;
                }
            }
        }

        return appendEntry(userId, existing, entryId, day, body, hasRecipe, ifMatch);
    }

    private AddedEntry appendEntry(
            String userId,
            WeeklyPlan existing,
            String entryId,
            String day,
            AddMealPlanEntryBody body,
            boolean hasRecipe,
            String ifMatch) {
        Versioning.checkIfMatch(ifMatch, existing.getUpdatedAt());
        String section = existing.getSections().stream()
                .filter(s -> s.equalsIgnoreCase(body.section().trim()))
                .findFirst()
                .orElseThrow(() -> IntegrationApiException.badRequest(
                        "section must be one of: " + String.join(", ", existing.getSections())));

        List<PlanEntry> entries = new ArrayList<>(existing.getEntries());
        entries.add(newEntry(entryId, day, section, body, hasRecipe));
        Instant previous = existing.getUpdatedAt();
        Instant next = Versioning.next(previous, clock);
        Versioning.compareAndSet(
                mongo,
                WeeklyPlan.class,
                existing.getId(),
                userId,
                previous,
                new Update().set("entries", entries).set("updatedAt", next));
        existing.setEntries(entries);
        existing.setUpdatedAt(next);
        return new AddedEntry(existing, entryId);
    }

    public WeeklyPlan removeEntry(String userId, String planId, String entryId, String ifMatch) {
        WeeklyPlan plan = weeklyPlanService.getForUser(userId, planId);
        Versioning.checkIfMatch(ifMatch, plan.getUpdatedAt());
        List<PlanEntry> entries = new ArrayList<>(plan.getEntries());
        if (!entries.removeIf(e -> Objects.equals(e.getId(), entryId))) {
            throw new WeeklyPlanNotFoundException("Meal plan entry not found");
        }
        Instant previous = plan.getUpdatedAt();
        Instant next = Versioning.next(previous, clock);
        Versioning.compareAndSet(
                mongo,
                WeeklyPlan.class,
                plan.getId(),
                userId,
                previous,
                new Update().set("entries", entries).set("updatedAt", next));
        plan.setEntries(entries);
        plan.setUpdatedAt(next);
        return plan;
    }

    public MealPlanDto toDto(String userId, String weekStart, WeeklyPlan plan) {
        if (plan == null) {
            return new MealPlanDto(null, weekStart, DEFAULT_SECTIONS, List.of(), null, null);
        }
        List<String> recipeIds = plan.getEntries().stream()
                .map(PlanEntry::getRecipeId)
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .toList();
        Map<String, String> titles = recipeIds.isEmpty()
                ? Map.of()
                : recipes.findAllByIdInAndUserId(recipeIds, userId).stream()
                        .collect(Collectors.toMap(Recipe::getId, Recipe::getTitle, (a, b) -> a));
        Function<PlanEntry, MealPlanEntryDto> toEntry = e -> new MealPlanEntryDto(
                e.getId(),
                e.getDay(),
                e.getSection(),
                e.getRecipeId(),
                e.getCustomTitle(),
                e.getRecipeId() != null ? titles.get(e.getRecipeId()) : e.getCustomTitle(),
                e.getNotes(),
                e.getPortions());
        return new MealPlanDto(
                plan.getId(),
                plan.getWeeklyStart(),
                plan.getSections(),
                plan.getEntries().stream().map(toEntry).toList(),
                plan.getUpdatedAt(),
                Versioning.version(plan.getUpdatedAt()));
    }

    private static PlanEntry newEntry(
            String id, String day, String section, AddMealPlanEntryBody body, boolean hasRecipe) {
        return new PlanEntry(
                id,
                day,
                section,
                hasRecipe ? body.recipeId().trim() : null,
                hasRecipe ? null : body.customTitle().trim(),
                List.of(),
                List.of(),
                body.notes(),
                body.portions());
    }
}
