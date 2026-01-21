package com.mealflow.appapi.shoppingLists.service;

import com.mealflow.appapi.recipes.domain.Recipe;
import com.mealflow.appapi.recipes.repository.RecipeRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class ShoppingListService {

    private final ShoppingListRepository shoppingListRepository;
    private final WeeklyPlanRepository weeklyPlanRepository;
    private final RecipeRepository recipeRepository;
    private final ShoppingListGenerator generator;
    private final Clock clock;

    public ShoppingListService(
            ShoppingListRepository shoppingListRepository,
            WeeklyPlanRepository weeklyPlanRepository,
            RecipeRepository recipeRepository,
            ShoppingListGenerator generator,
            Clock clock) {
        this.shoppingListRepository = shoppingListRepository;
        this.weeklyPlanRepository = weeklyPlanRepository;
        this.recipeRepository = recipeRepository;
        this.generator = generator;
        this.clock = clock;
    }

    public List<ShoppingList> listForUser(String userId, ShoppingListStatus status) {
        if (status == null) {
            return shoppingListRepository.findAllByUserIdOrderByUpdatedAtDesc(userId);
        }
        return shoppingListRepository.findAllByUserIdAndStatusOrderByUpdatedAtDesc(userId, status);
    }

    public ShoppingList getForUser(String userId, String listId) {
        return shoppingListRepository
                .findByIdAndUserId(listId, userId)
                .orElseThrow(() -> new ShoppingListNotFoundException("Shopping list not found"));
    }

    public ShoppingList createOrMerge(String userId, String weeklyPlanId) {
        ShoppingList active = ensureActiveList(userId);
        if (weeklyPlanId == null || weeklyPlanId.isBlank()) {
            return active;
        }

        WeeklyPlan plan = weeklyPlanRepository
                .findByIdAndUserId(weeklyPlanId, userId)
                .orElseThrow(() -> new WeeklyPlanNotFoundException("Weekly plan not found"));

        List<ShoppingListItem> mergedItems = generator.mergePlan(active.getItems(), plan, loadRecipes(plan, userId));
        active.setItems(mergedItems);
        active.setWeeklyPlanId(weeklyPlanId);
        active.setUpdatedAt(clock.instant());
        return shoppingListRepository.save(active);
    }

    public ShoppingList patchList(String userId, String listId, ShoppingListStatus status) {
        ShoppingList list = getForUser(userId, listId);
        if (status != null && list.getStatus() != status) {
            list.setStatus(status);
            list.setUpdatedAt(clock.instant());
            shoppingListRepository.save(list);
        }

        if (status == ShoppingListStatus.ARCHIVED) {
            ensureActiveList(userId);
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

        ShoppingListItem item =
                new ShoppingListItem(UUID.randomUUID().toString(), normalizedName, quantity, normalizedUnit, false);

        List<ShoppingListItem> items = new ArrayList<>(list.getItems());
        items.add(item);
        list.setItems(items);
        list.setUpdatedAt(clock.instant());
        return shoppingListRepository.save(list);
    }

    public ShoppingList updateItem(
            String userId, String listId, String itemId, String name, Double quantity, String unit, Boolean checked) {
        ShoppingList list = getForUser(userId, listId);
        ShoppingListItem item = findItem(list, itemId);

        if (name != null) {
            String normalizedName = normalizeName(name);
            if (normalizedName.isBlank()) {
                throw new ShoppingListValidationException("name must not be blank");
            }
            item.setName(normalizedName);
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

    private ShoppingList ensureActiveList(String userId) {
        Optional<ShoppingList> active = shoppingListRepository.findFirstByUserIdAndStatusOrderByUpdatedAtDesc(
                userId, ShoppingListStatus.ACTIVE);
        if (active.isPresent()) {
            return active.get();
        }

        Instant now = clock.instant();
        ShoppingList list = new ShoppingList(userId, ShoppingListStatus.ACTIVE, null, List.of(), now, now);
        return shoppingListRepository.save(list);
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

    private String normalizeUnit(String unit) {
        if (unit == null) {
            return null;
        }
        String trimmed = unit.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private ShoppingListItem findItem(ShoppingList list, String itemId) {
        return list.getItems().stream()
                .filter(item -> Objects.equals(item.getId(), itemId))
                .findFirst()
                .orElseThrow(() -> new ShoppingListNotFoundException("Shopping list item not found"));
    }
}
