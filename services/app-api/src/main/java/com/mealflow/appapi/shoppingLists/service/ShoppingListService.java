package com.mealflow.appapi.shoppingLists.service;

import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.repository.RecipeRepository;
import com.mealflow.appapi.shoppingLists.domain.ShoppingItemCategory;
import com.mealflow.appapi.shoppingLists.domain.ShoppingList;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListItem;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListStatus;
import com.mealflow.appapi.shoppingLists.repository.ShoppingListRepository;
import com.mealflow.appapi.weeklyPlans.domain.PlanEntry;
import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import com.mealflow.appapi.weeklyPlans.repository.WeeklyPlanRepository;
import com.mealflow.appapi.weeklyPlans.service.WeeklyPlanNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

@Service
public class ShoppingListService {
    private static final int DEFAULT_PAGE_LIMIT = 20;
    private static final int MAX_PAGE_LIMIT = 100;

    private final ShoppingListRepository shoppingListRepository;
    private final WeeklyPlanRepository weeklyPlanRepository;
    private final RecipeRepository recipeRepository;
    private final ShoppingListGenerator generator;
    private final ItemCategoryResolver categoryResolver;
    private final LlmItemNameNormalizer nameNormalizer;
    private final ActiveShoppingListLock activeListLock;
    private final MongoTemplate mongo;
    private final Clock clock;

    public ShoppingListService(
            ShoppingListRepository shoppingListRepository,
            WeeklyPlanRepository weeklyPlanRepository,
            RecipeRepository recipeRepository,
            ShoppingListGenerator generator,
            ItemCategoryResolver categoryResolver,
            LlmItemNameNormalizer nameNormalizer,
            ActiveShoppingListLock activeListLock,
            MongoTemplate mongo,
            Clock clock) {
        this.shoppingListRepository = shoppingListRepository;
        this.weeklyPlanRepository = weeklyPlanRepository;
        this.recipeRepository = recipeRepository;
        this.generator = generator;
        this.categoryResolver = categoryResolver;
        this.nameNormalizer = nameNormalizer;
        this.activeListLock = activeListLock;
        this.mongo = mongo;
        this.clock = clock;
    }

    public List<ShoppingList> listForUser(String userId, ShoppingListStatus status) {
        if (status == null) {
            return shoppingListRepository.findAllByUserIdOrderByUpdatedAtDesc(userId);
        }
        return shoppingListRepository.findAllByUserIdAndStatusOrderByUpdatedAtDesc(userId, status);
    }

    public List<ShoppingList> listForUser(String userId, ShoppingListStatus status, Integer limit, Integer offset) {
        if (limit == null && offset == null) {
            return listForUser(userId, status);
        }
        int safeLimit = sanitizeLimit(limit);
        int safeOffset = sanitizeOffset(offset);
        Pageable pageable = PageRequest.of(safeOffset / safeLimit, safeLimit);
        if (status == null) {
            return shoppingListRepository.findAllByUserIdOrderByUpdatedAtDesc(userId, pageable);
        }
        return shoppingListRepository.findAllByUserIdAndStatusOrderByUpdatedAtDesc(userId, status, pageable);
    }

    public ShoppingList getForUser(String userId, String listId) {
        return shoppingListRepository
                .findByIdAndUserId(listId, userId)
                .orElseThrow(() -> new ShoppingListNotFoundException("Shopping list not found"));
    }

    public ShoppingList createOrMerge(String userId, String weeklyPlanId, boolean replace, String title) {
        ShoppingList active = ensureActiveList(userId);
        String normalizedTitle = normalizeTitle(title);
        if (weeklyPlanId == null || weeklyPlanId.isBlank()) {
            if (!replace) {
                return active;
            }
            active.setItems(List.of());
            active.setWeeklyPlanId(null);
            if (normalizedTitle != null) {
                active.setTitle(normalizedTitle);
            }
            active.setUpdatedAt(clock.instant());
            return shoppingListRepository.save(active);
        }

        WeeklyPlan plan = weeklyPlanRepository
                .findByIdAndUserId(weeklyPlanId, userId)
                .orElseThrow(() -> new WeeklyPlanNotFoundException("Weekly plan not found"));

        List<ShoppingListItem> baseItems = replace ? List.of() : active.getItems();
        String currentTitle = normalizeTitle(active.getTitle());
        String nextTitle = normalizedTitle != null
                ? normalizedTitle
                : currentTitle != null ? currentTitle : defaultTitleForPlan(plan.getWeeklyStart());
        Map<String, Recipe> recipes = loadRecipes(plan, userId);
        // One LLM call turns ingredient names into product names (and aisles), so the same product
        // from several recipes lands on one line. Without it, names merge on exact spelling.
        Map<String, NormalizedItemName> normalizedNames =
                nameNormalizer.normalize(generator.collectNames(baseItems, plan, recipes));
        List<ShoppingListItem> mergedItems = generator.mergePlan(baseItems, plan, recipes, normalizedNames);
        // Aisles for whatever the normalization didn't cover: keywords first, then one LLM call.
        categoryResolver.applyCategories(mergedItems);
        active.setItems(mergedItems);
        active.setWeeklyPlanId(weeklyPlanId);
        active.setTitle(nextTitle);
        active.setUpdatedAt(clock.instant());
        return shoppingListRepository.save(active);
    }

    /** A week's plan made ready to merge into a list: its recipes and the normalized item names. */
    public record PreparedPlan(WeeklyPlan plan, Map<String, Recipe> recipes, Map<String, NormalizedItemName> names) {}

    /**
     * The first half of {@link #createOrMerge} for a plan, for callers that write the list themselves:
     * loads the plan's recipes and normalizes the names exactly as the app does (at most one LLM call,
     * none when nothing is planned). Empty when the plan puts nothing on a list.
     */
    public Optional<PreparedPlan> preparePlan(String userId, WeeklyPlan plan, List<ShoppingListItem> existingItems) {
        Map<String, Recipe> recipes = loadRecipes(plan, userId);
        if (!generator.hasItems(plan, recipes)) {
            return Optional.empty();
        }
        Map<String, NormalizedItemName> names =
                nameNormalizer.normalize(generator.collectNames(existingItems, plan, recipes));
        return Optional.of(new PreparedPlan(plan, recipes, names));
    }

    /**
     * The second half: merges the plan into {@code existingItems} as {@link #createOrMerge} does and
     * fills in aisles (keywords, then at most one LLM call). Nothing is saved.
     */
    public ShoppingListGenerator.PlanMerge mergePrepared(PreparedPlan prepared, List<ShoppingListItem> existingItems) {
        return mergePrepared(prepared, existingItems, null);
    }

    /**
     * As {@link #mergePrepared(PreparedPlan, List)}, for a retry after the list changed underneath:
     * the aisles an earlier attempt ({@code previous}) found are copied by name, and when the merged
     * lines have the same names as in {@code previous} the category step (keywords + LLM) is not run
     * again. Otherwise it runs for whatever is still uncategorised, as usual.
     */
    public ShoppingListGenerator.PlanMerge mergePrepared(
            PreparedPlan prepared, List<ShoppingListItem> existingItems, ShoppingListGenerator.PlanMerge previous) {
        ShoppingListGenerator.PlanMerge merge =
                generator.mergePlanCounting(existingItems, prepared.plan(), prepared.recipes(), prepared.names());
        if (previous == null) {
            categoryResolver.applyCategories(merge.items());
            return merge;
        }
        Map<String, ShoppingItemCategory> known = new HashMap<>();
        for (ShoppingListItem item : previous.items()) {
            if (item.getName() != null && item.getCategory() != ShoppingItemCategory.OTHER) {
                known.putIfAbsent(item.getName(), item.getCategory());
            }
        }
        for (ShoppingListItem item : merge.items()) {
            ShoppingItemCategory category = known.get(item.getName());
            if (item.getCategory() == ShoppingItemCategory.OTHER && category != null) {
                item.setCategory(category);
            }
        }
        if (!sameNames(previous.items(), merge.items())) {
            categoryResolver.applyCategories(merge.items());
        }
        return merge;
    }

    private static boolean sameNames(List<ShoppingListItem> a, List<ShoppingListItem> b) {
        return a.stream()
                .map(ShoppingListItem::getName)
                .collect(Collectors.toSet())
                .equals(b.stream().map(ShoppingListItem::getName).collect(Collectors.toSet()));
    }

    /** The title {@link #createOrMerge} gives a list merged from this plan without an explicit title. */
    public String titleForPlan(String currentTitle, WeeklyPlan plan) {
        String current = normalizeTitle(currentTitle);
        return current != null ? current : defaultTitleForPlan(plan.getWeeklyStart());
    }

    /**
     * Renames and/or changes the status of a list. A user has at most one active list: making a list
     * active archives the other active one (it becomes the app's "current" list); archiving the active
     * list makes sure a new empty active list exists. Status changes run under the per-user
     * {@link ActiveShoppingListLock}, so concurrent requests cannot leave two active lists.
     */
    public ShoppingList patchList(String userId, String listId, ShoppingListStatus status, String title) {
        if (status == null) {
            return applyPatch(userId, listId, null, title);
        }
        return activeListLock.withLock(userId, () -> applyPatch(userId, listId, status, title));
    }

    private ShoppingList applyPatch(String userId, String listId, ShoppingListStatus status, String title) {
        ShoppingList list = getForUser(userId, listId);
        String normalizedTitle = normalizeTitle(title);
        if (title != null && normalizedTitle == null) {
            throw new ShoppingListValidationException("title must not be blank");
        }
        if (status != null && list.getStatus() != status) {
            if (status == ShoppingListStatus.ACTIVE) {
                archiveOtherActiveLists(userId, listId);
            }
            list.setStatus(status);
            list.setUpdatedAt(clock.instant());
            shoppingListRepository.save(list);
        }
        if (normalizedTitle != null) {
            list.setTitle(normalizedTitle);
            list.setUpdatedAt(clock.instant());
            shoppingListRepository.save(list);
        }

        if (status == ShoppingListStatus.ARCHIVED) {
            findOrCreateActive(userId);
        }

        return list;
    }

    public ShoppingList addItem(String userId, String listId, String name, Double quantity, String unit) {
        ShoppingList list = getForUser(userId, listId);
        String normalizedName = normalizeName(name);
        if (normalizedName.isBlank()) {
            throw new ShoppingListValidationException("name must not be blank");
        }
        String normalizedUnit = normalizeUnit(unit);

        // Keyword lookup only — an item added by hand must land in its section immediately.
        ShoppingListItem item = new ShoppingListItem(
                UUID.randomUUID().toString(),
                normalizedName,
                quantity,
                normalizedUnit,
                false,
                categoryResolver.resolveFromKeywords(normalizedName));

        List<ShoppingListItem> items = new ArrayList<>(list.getItems());
        items.add(item);
        list.setItems(items);
        list.setUpdatedAt(clock.instant());
        return shoppingListRepository.save(list);
    }

    public ShoppingList updateItem(
            String userId,
            String listId,
            String itemId,
            String name,
            Double quantity,
            String unit,
            Boolean checked,
            ShoppingItemCategory category) {
        ShoppingList list = getForUser(userId, listId);
        ShoppingListItem item = findItem(list, itemId);

        if (name != null) {
            String normalizedName = normalizeName(name);
            if (normalizedName.isBlank()) {
                throw new ShoppingListValidationException("name must not be blank");
            }
            boolean renamed = !normalizedName.equalsIgnoreCase(item.getName());
            item.setName(normalizedName);
            // Re-derive the aisle on rename, unless the caller is setting one explicitly.
            if (renamed && category == null) {
                item.setCategory(categoryResolver.resolveFromKeywords(normalizedName));
            }
        }

        if (category != null) {
            item.setCategory(category);
        }

        if (unit != null) {
            item.setUnit(normalizeUnit(unit));
        }

        if (quantity != null) {
            item.setQuantity(quantity);
        }

        if (checked != null) {
            item.setChecked(checked);
        }

        list.setUpdatedAt(clock.instant());
        return shoppingListRepository.save(list);
    }

    public void deleteItem(String userId, String listId, String itemId) {
        ShoppingList list = getForUser(userId, listId);
        List<ShoppingListItem> items = new ArrayList<>(list.getItems());
        boolean removed = items.removeIf(item -> Objects.equals(item.getId(), itemId));
        if (!removed) {
            throw new ShoppingListNotFoundException("Shopping list item not found");
        }
        list.setItems(items);
        list.setUpdatedAt(clock.instant());
        shoppingListRepository.save(list);
    }

    public void deleteList(String userId, String listId) {
        ShoppingList existing = getForUser(userId, listId);
        long deleted = shoppingListRepository.deleteByIdAndUserId(listId, userId);
        if (deleted == 0) {
            throw new ShoppingListNotFoundException("Shopping list not found");
        }
        if (existing.getStatus() == ShoppingListStatus.ACTIVE) {
            ensureActiveList(userId);
        }
    }

    /** The user's active list, and whether this call had to create it. */
    public record ActiveList(ShoppingList list, boolean created) {}

    /**
     * Returns the user's active list, creating an empty one if there is none. Serialised per user, so
     * concurrent callers (app or integration API, any instance) end up with the same single list.
     */
    public ActiveList ensureActive(String userId) {
        return activeListLock.withLock(userId, () -> findOrCreateActive(userId));
    }

    private ShoppingList ensureActiveList(String userId) {
        return ensureActive(userId).list();
    }

    /** Caller must hold {@link ActiveShoppingListLock} for the user. */
    private ActiveList findOrCreateActive(String userId) {
        Optional<ShoppingList> active = shoppingListRepository.findFirstByUserIdAndStatusOrderByUpdatedAtDesc(
                userId, ShoppingListStatus.ACTIVE);
        if (active.isPresent()) {
            return new ActiveList(active.get(), false);
        }

        // Millisecond precision, as Mongo stores it, so the returned list equals what a later read sees.
        Instant now = clock.instant().truncatedTo(ChronoUnit.MILLIS);
        ShoppingList list = new ShoppingList(userId, ShoppingListStatus.ACTIVE, null, null, List.of(), now, now);
        return new ActiveList(shoppingListRepository.save(list), true);
    }

    /** Caller must hold {@link ActiveShoppingListLock} for the user. Touches only status/updatedAt. */
    private void archiveOtherActiveLists(String userId, String keepListId) {
        Query others = Query.query(Criteria.where("userId")
                .is(userId)
                .and("status")
                .is(ShoppingListStatus.ACTIVE)
                .and("id")
                .ne(keepListId));
        mongo.updateMulti(
                others,
                new Update().set("status", ShoppingListStatus.ARCHIVED).set("updatedAt", clock.instant()),
                ShoppingList.class);
    }

    private Map<String, Recipe> loadRecipes(WeeklyPlan plan, String userId) {
        List<PlanEntry> entries = plan.getEntries() == null ? List.of() : plan.getEntries();
        List<String> recipeIds = entries.stream()
                .map(PlanEntry::getRecipeId)
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .toList();

        if (recipeIds.isEmpty()) {
            return Map.of();
        }

        return recipeRepository.findAllByIdInAndUserId(recipeIds, userId).stream()
                .collect(Collectors.toMap(Recipe::getId, recipe -> recipe));
    }

    private String normalizeName(String name) {
        if (name == null) {
            return "";
        }
        return name.trim();
    }

    private String normalizeTitle(String title) {
        if (title == null) {
            return null;
        }
        String trimmed = title.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String normalizeUnit(String unit) {
        if (unit == null) {
            return null;
        }
        String trimmed = unit.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String defaultTitleForPlan(String weeklyStart) {
        if (weeklyStart == null || weeklyStart.isBlank()) {
            return "Shopping List";
        }
        try {
            LocalDate date = LocalDate.parse(weeklyStart.trim());
            int week = date.get(WeekFields.ISO.weekOfWeekBasedYear());
            return "Week " + week + " Shopping List";
        } catch (Exception ex) {
            return "Shopping List";
        }
    }

    private ShoppingListItem findItem(ShoppingList list, String itemId) {
        return list.getItems().stream()
                .filter(item -> Objects.equals(item.getId(), itemId))
                .findFirst()
                .orElseThrow(() -> new ShoppingListNotFoundException("Shopping list item not found"));
    }

    private int sanitizeLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_PAGE_LIMIT;
        }
        return Math.min(limit, MAX_PAGE_LIMIT);
    }

    private int sanitizeOffset(Integer offset) {
        if (offset == null || offset < 0) {
            return 0;
        }
        return offset;
    }
}
