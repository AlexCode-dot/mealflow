package com.mealflow.appapi.weeklyPlans.web.mapper;

import com.mealflow.appapi.weeklyPlans.domain.PlanEntry;
import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import com.mealflow.appapi.weeklyPlans.web.dto.CreateWeeklyPlanRequest;
import com.mealflow.appapi.weeklyPlans.web.dto.PlanEntryRequest;
import com.mealflow.appapi.weeklyPlans.web.dto.PlanEntryResponse;
import com.mealflow.appapi.weeklyPlans.web.dto.UpdateWeeklyPlanRequest;
import com.mealflow.appapi.weeklyPlans.web.dto.WeeklyPlanListItemResponse;
import com.mealflow.appapi.weeklyPlans.web.dto.WeeklyPlanResponse;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class WeeklyPlanMapper {

    public CreateArgs toCreateArgs(String userId, CreateWeeklyPlanRequest body) {
        List<PlanEntry> entries = body.entries() == null
                ? List.of()
                : body.entries().stream().map(this::toDomain).toList();
        List<String> sections = body.sections() == null
                ? null
                : body.sections().stream().map(String::trim).toList();

        return new CreateArgs(userId, body.weeklyStart().trim(), sections, entries);
    }

    public PatchArgs toPatchArgs(String userId, String planId, UpdateWeeklyPlanRequest body) {
        List<PlanEntry> entries = body.entries() == null
                ? null
                : body.entries().stream().map(this::toDomain).toList();
        List<String> sections = body.sections() == null
                ? null
                : body.sections().stream().map(String::trim).toList();

        String weeklyStart =
                body.weeklyStart() == null ? null : body.weeklyStart().trim();

        return new PatchArgs(userId, planId, weeklyStart, sections, entries);
    }

    public WeeklyPlanListItemResponse toListItem(WeeklyPlan plan) {
        int entryCount = plan.getEntries() == null ? 0 : plan.getEntries().size();
        return new WeeklyPlanListItemResponse(
                plan.getId(), plan.getWeeklyStart(), entryCount, plan.getCreatedAt(), plan.getUpdatedAt());
    }

    public WeeklyPlanResponse toResponse(WeeklyPlan plan) {
        List<PlanEntryResponse> entries = plan.getEntries() == null
                ? List.of()
                : plan.getEntries().stream().map(this::toResponse).toList();
        List<String> sections = plan.getSections() == null ? List.of() : plan.getSections();

        return new WeeklyPlanResponse(
                plan.getId(),
                plan.getWeeklyStart(),
                sections,
                entries,
                plan.getCreatedAt(),
                plan.getUpdatedAt());
    }

    private PlanEntry toDomain(PlanEntryRequest req) {
        String day = req.day().trim();
        String section = req.section().trim();
        String recipeId = req.recipeId() == null ? null : req.recipeId().trim();
        String customTitle =
                req.customTitle() == null ? null : req.customTitle().trim();
        String notes = req.notes() == null ? null : req.notes().trim();
        List<String> items = req.items() == null
                ? List.of()
                : req.items().stream().map(String::trim).toList();
        List<String> extraItems = req.extraItems() == null
                ? List.of()
                : req.extraItems().stream().map(String::trim).toList();

        return new PlanEntry(req.id(), day, section, recipeId, customTitle, items, extraItems, notes, req.portions());
    }

    private PlanEntryResponse toResponse(PlanEntry entry) {
        return new PlanEntryResponse(
                entry.getId(),
                entry.getDay(),
                entry.getSection(),
                entry.getRecipeId(),
                entry.getCustomTitle(),
                entry.getItems(),
                entry.getExtraItems(),
                entry.getNotes(),
                entry.getPortions());
    }

    public record CreateArgs(String userId, String weeklyStart, List<String> sections, List<PlanEntry> entries) {}

    public record PatchArgs(
            String userId, String planId, String weeklyStart, List<String> sections, List<PlanEntry> entries) {}
}
