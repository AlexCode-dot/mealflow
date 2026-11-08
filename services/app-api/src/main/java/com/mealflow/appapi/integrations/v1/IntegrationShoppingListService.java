package com.mealflow.appapi.integrations.v1;

import com.mealflow.appapi.integrations.v1.dto.AddShoppingItemBody;
import com.mealflow.appapi.integrations.v1.dto.ShoppingListDto;
import com.mealflow.appapi.integrations.v1.dto.ShoppingListItemDto;
import com.mealflow.appapi.integrations.v1.dto.ShoppingListSummaryDto;
import com.mealflow.appapi.shoppingLists.domain.ShoppingList;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListItem;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListStatus;
import com.mealflow.appapi.shoppingLists.service.ItemCategoryResolver;
import com.mealflow.appapi.shoppingLists.service.ShoppingListGenerator;
import com.mealflow.appapi.shoppingLists.service.ShoppingListNotFoundException;
import com.mealflow.appapi.shoppingLists.service.ShoppingListService;
import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Consumer;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** Shopping list operations for the integration API. Every query is scoped to the token's user. */
@Service
public class IntegrationShoppingListService {

    /** Write attempts for from-plan when the list changes underneath (each re-reads the list). */
    static final int FROM_PLAN_ATTEMPTS = 3;

    private final ShoppingListService shoppingLists;
    private final IntegrationMealPlanService mealPlans;
    private final ItemCategoryResolver categoryResolver;
    private final MongoTemplate mongo;
    private final Clock clock;

    public IntegrationShoppingListService(
            ShoppingListService shoppingLists,
            IntegrationMealPlanService mealPlans,
            ItemCategoryResolver categoryResolver,
            MongoTemplate mongo,
            Clock clock) {
        this.shoppingLists = shoppingLists;
        this.mealPlans = mealPlans;
        this.categoryResolver = categoryResolver;
        this.mongo = mongo;
        this.clock = clock;
    }

    public List<ShoppingListSummaryDto> list(String userId, String status) {
        ShoppingListStatus parsed = null;
        if (status != null && !status.isBlank()) {
            try {
                parsed = ShoppingListStatus.fromValue(status);
            } catch (IllegalArgumentException ex) {
                throw IntegrationApiException.badRequest(ex.getMessage());
            }
        }
        return shoppingLists.listForUser(userId, parsed).stream()
                .map(IntegrationShoppingListService::toSummary)
                .toList();
    }

    public ShoppingList get(String userId, String listId) {
        return shoppingLists.getForUser(userId, listId);
    }

    /** The user's single active list, created empty if there is none (see {@link ShoppingListService#ensureActive}). */
    public ShoppingListService.ActiveList ensureActive(String userId) {
        return shoppingLists.ensureActive(userId);
    }

    /** The active list after a week's plan was added, and what the plan did to it. */
    public record FromPlan(ShoppingList list, int added, int merged) {}

    /**
     * Adds the week's plan to the user's single active list, exactly as the app's "generate from plan"
     * merges into the current list (portion scaling, name normalization, aisles; same title and
     * {@code weeklyPlanId} as the app sets). The plan is checked first: no plan, or nothing on it to
     * buy, is 422 {@code plan_empty} and nothing is written (the active list is not even created).
     *
     * <p>Name normalization runs once; the merge itself is compare-and-set on the list's version and
     * is redone on a fresh read if the list changed meanwhile (at most {@value #FROM_PLAN_ATTEMPTS}
     * attempts, then 412).
     */
    public FromPlan addPlan(String userId, String week) {
        String weekStart = mealPlans.weekStart(requireWeek(week));
        WeeklyPlan plan = mealPlans.find(userId, weekStart);
        if (plan == null) {
            throw planEmpty();
        }
        List<ShoppingListItem> current = shoppingLists.listForUser(userId, ShoppingListStatus.ACTIVE).stream()
                .findFirst()
                .map(ShoppingList::getItems)
                .orElse(List.of());
        ShoppingListService.PreparedPlan prepared =
                shoppingLists.preparePlan(userId, plan, current).orElseThrow(IntegrationShoppingListService::planEmpty);

        for (int attempt = 1; ; attempt++) {
            ShoppingList list = shoppingLists.ensureActive(userId).list();
            ShoppingListGenerator.PlanMerge merge = shoppingLists.mergePrepared(prepared, copyOf(list.getItems()));
            String title = shoppingLists.titleForPlan(list.getTitle(), plan);
            Instant previous = list.getUpdatedAt();
            Instant next = Versioning.next(previous, clock);
            try {
                Versioning.compareAndSet(
                        mongo,
                        ShoppingList.class,
                        list.getId(),
                        userId,
                        previous,
                        new Update()
                                .set("items", merge.items())
                                .set("weeklyPlanId", plan.getId())
                                .set("title", title)
                                .set("updatedAt", next));
            } catch (IntegrationApiException conflict) {
                if (conflict.getStatus() == HttpStatus.PRECONDITION_FAILED && attempt < FROM_PLAN_ATTEMPTS) {
                    continue;
                }
                throw conflict;
            }
            list.setItems(merge.items());
            list.setWeeklyPlanId(plan.getId());
            list.setTitle(title);
            list.setUpdatedAt(next);
            return new FromPlan(list, merge.added(), merge.merged());
        }
    }

    private static String requireWeek(String week) {
        String normalized = week == null ? "" : week.trim().toLowerCase(Locale.ROOT);
        if (!"current".equals(normalized) && !"next".equals(normalized)) {
            throw IntegrationApiException.badRequest("week must be 'current' or 'next'");
        }
        return normalized;
    }

    private static IntegrationApiException planEmpty() {
        return IntegrationApiException.unprocessable(
                "The week's meal plan has nothing to put on a shopping list", "plan_empty");
    }

    /** The merge updates lines in place; work on copies so a retry starts from what is stored. */
    private static List<ShoppingListItem> copyOf(List<ShoppingListItem> items) {
        List<ShoppingListItem> copies = new ArrayList<>(items == null ? 0 : items.size());
        for (ShoppingListItem i : items == null ? List.<ShoppingListItem>of() : items) {
            copies.add(new ShoppingListItem(
                    i.getId(), i.getName(), i.getQuantity(), i.getUnit(), i.isChecked(), i.getCategory()));
        }
        return copies;
    }

    public record AddedItem(ShoppingList list, String itemId) {}

    public AddedItem addItem(String userId, String listId, AddShoppingItemBody body, String ifMatch) {
        String name = body.name().trim();
        String unit = body.unit() == null || body.unit().isBlank()
                ? null
                : body.unit().trim();
        String itemId = UUID.randomUUID().toString();
        ShoppingListItem item = new ShoppingListItem(
                itemId, name, body.quantity(), unit, false, categoryResolver.resolveFromKeywords(name));
        ShoppingList list = modifyItems(userId, listId, ifMatch, items -> items.add(item));
        return new AddedItem(list, itemId);
    }

    public ShoppingList removeItem(String userId, String listId, String itemId, String ifMatch) {
        return modifyItems(userId, listId, ifMatch, items -> {
            if (!items.removeIf(i -> Objects.equals(i.getId(), itemId))) {
                throw new ShoppingListNotFoundException("Shopping list item not found");
            }
        });
    }

    public ShoppingList setChecked(String userId, String listId, String itemId, boolean checked, String ifMatch) {
        return modifyItems(userId, listId, ifMatch, items -> items.stream()
                .filter(i -> Objects.equals(i.getId(), itemId))
                .findFirst()
                .orElseThrow(() -> new ShoppingListNotFoundException("Shopping list item not found"))
                .setChecked(checked));
    }

    private ShoppingList modifyItems(
            String userId, String listId, String ifMatch, Consumer<List<ShoppingListItem>> change) {
        ShoppingList list = shoppingLists.getForUser(userId, listId);
        Versioning.checkIfMatch(ifMatch, list.getUpdatedAt());
        List<ShoppingListItem> items = new ArrayList<>(list.getItems());
        change.accept(items);
        Instant previous = list.getUpdatedAt();
        Instant next = Versioning.next(previous, clock);
        Versioning.compareAndSet(
                mongo,
                ShoppingList.class,
                list.getId(),
                userId,
                previous,
                new Update().set("items", items).set("updatedAt", next));
        list.setItems(items);
        list.setUpdatedAt(next);
        return list;
    }

    public static ShoppingListDto toDto(ShoppingList list) {
        return new ShoppingListDto(
                list.getId(),
                list.getTitle(),
                list.getStatus() == null ? null : list.getStatus().value(),
                list.getItems().stream()
                        .map(i -> new ShoppingListItemDto(
                                i.getId(),
                                i.getName(),
                                i.getQuantity(),
                                i.getUnit(),
                                i.isChecked(),
                                i.getCategory().value()))
                        .toList(),
                list.getUpdatedAt(),
                Versioning.version(list.getUpdatedAt()));
    }

    private static ShoppingListSummaryDto toSummary(ShoppingList list) {
        int checked = (int)
                list.getItems().stream().filter(ShoppingListItem::isChecked).count();
        return new ShoppingListSummaryDto(
                list.getId(),
                list.getTitle(),
                list.getStatus() == null ? null : list.getStatus().value(),
                list.getItems().size(),
                checked,
                list.getUpdatedAt(),
                Versioning.version(list.getUpdatedAt()));
    }
}
