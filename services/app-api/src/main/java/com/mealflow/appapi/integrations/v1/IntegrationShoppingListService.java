package com.mealflow.appapi.integrations.v1;

import com.mealflow.appapi.integrations.v1.dto.AddShoppingItemBody;
import com.mealflow.appapi.integrations.v1.dto.ShoppingListDto;
import com.mealflow.appapi.integrations.v1.dto.ShoppingListItemDto;
import com.mealflow.appapi.integrations.v1.dto.ShoppingListSummaryDto;
import com.mealflow.appapi.shoppingLists.domain.ShoppingList;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListItem;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListStatus;
import com.mealflow.appapi.shoppingLists.service.ItemCategoryResolver;
import com.mealflow.appapi.shoppingLists.service.ShoppingListNotFoundException;
import com.mealflow.appapi.shoppingLists.service.ShoppingListService;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Consumer;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/** Shopping list operations for the integration API. Every query is scoped to the token's user. */
@Service
public class IntegrationShoppingListService {

    private final ShoppingListService shoppingLists;
    private final ItemCategoryResolver categoryResolver;
    private final MongoTemplate mongo;
    private final Clock clock;

    public IntegrationShoppingListService(
            ShoppingListService shoppingLists,
            ItemCategoryResolver categoryResolver,
            MongoTemplate mongo,
            Clock clock) {
        this.shoppingLists = shoppingLists;
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
