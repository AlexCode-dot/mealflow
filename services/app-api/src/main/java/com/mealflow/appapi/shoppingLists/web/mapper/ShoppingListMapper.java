package com.mealflow.appapi.shoppingLists.web.mapper;

import com.mealflow.appapi.shoppingLists.domain.ShoppingList;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListItem;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListStatus;
import com.mealflow.appapi.shoppingLists.service.ShoppingListValidationException;
import com.mealflow.appapi.shoppingLists.web.dto.AddShoppingListItemRequest;
import com.mealflow.appapi.shoppingLists.web.dto.CreateShoppingListRequest;
import com.mealflow.appapi.shoppingLists.web.dto.ShoppingListItemResponse;
import com.mealflow.appapi.shoppingLists.web.dto.ShoppingListListItemResponse;
import com.mealflow.appapi.shoppingLists.web.dto.ShoppingListResponse;
import com.mealflow.appapi.shoppingLists.web.dto.UpdateShoppingListItemRequest;
import com.mealflow.appapi.shoppingLists.web.dto.UpdateShoppingListRequest;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ShoppingListMapper {

    public CreateArgs toCreateArgs(String userId, CreateShoppingListRequest body) {
        String weeklyPlanId = body == null || body.weeklyPlanId() == null
                ? null
                : body.weeklyPlanId().trim();
        return new CreateArgs(userId, weeklyPlanId);
    }

    public PatchArgs toPatchArgs(String userId, String listId, UpdateShoppingListRequest body) {
        String statusRaw = body == null ? null : body.status();
        ShoppingListStatus status = null;
        if (statusRaw != null) {
            try {
                status = ShoppingListStatus.fromValue(statusRaw);
            } catch (IllegalArgumentException ex) {
                throw new ShoppingListValidationException(ex.getMessage());
            }
        }
        return new PatchArgs(userId, listId, status);
    }

    public AddItemArgs toAddItemArgs(String userId, String listId, AddShoppingListItemRequest body) {
        String name = body.name().trim();
        String unit = body.unit() == null ? null : body.unit().trim();
        return new AddItemArgs(userId, listId, name, body.quantity(), unit);
    }

    public UpdateItemArgs toUpdateItemArgs(
            String userId, String listId, String itemId, UpdateShoppingListItemRequest body) {
        String name = body.name() == null ? null : body.name().trim();
        String unit = body.unit() == null ? null : body.unit().trim();
        return new UpdateItemArgs(userId, listId, itemId, name, body.quantity(), unit, body.checked());
    }

    public ShoppingListResponse toResponse(ShoppingList list) {
        List<ShoppingListItemResponse> items = list.getItems() == null
                ? List.of()
                : list.getItems().stream().map(this::toResponse).toList();
        return new ShoppingListResponse(
                list.getId(),
                list.getStatus() == null ? null : list.getStatus().value(),
                list.getWeeklyPlanId(),
                items,
                list.getCreatedAt(),
                list.getUpdatedAt());
    }

    public ShoppingListListItemResponse toListItem(ShoppingList list) {
        int count = list.getItems() == null ? 0 : list.getItems().size();
        return new ShoppingListListItemResponse(
                list.getId(),
                list.getStatus() == null ? null : list.getStatus().value(),
                list.getWeeklyPlanId(),
                count,
                list.getCreatedAt(),
                list.getUpdatedAt());
    }

    private ShoppingListItemResponse toResponse(ShoppingListItem item) {
        return new ShoppingListItemResponse(
                item.getId(), item.getName(), item.getQuantity(), item.getUnit(), item.isChecked());
    }

    public record CreateArgs(String userId, String weeklyPlanId) {}

    public record PatchArgs(String userId, String listId, ShoppingListStatus status) {}

    public record AddItemArgs(String userId, String listId, String name, Double quantity, String unit) {}

    public record UpdateItemArgs(
            String userId,
            String listId,
            String itemId,
            String name,
            Double quantity,
            String unit,
            Boolean checked) {}
}
