package com.mealflow.appapi.shoppingLists.web;

import com.mealflow.appapi.security.config.CurrentUser;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListStatus;
import com.mealflow.appapi.shoppingLists.service.ShoppingListService;
import com.mealflow.appapi.shoppingLists.service.ShoppingListValidationException;
import com.mealflow.appapi.shoppingLists.web.dto.AddShoppingListItemRequest;
import com.mealflow.appapi.shoppingLists.web.dto.CreateShoppingListRequest;
import com.mealflow.appapi.shoppingLists.web.dto.ShoppingListListItemResponse;
import com.mealflow.appapi.shoppingLists.web.dto.ShoppingListResponse;
import com.mealflow.appapi.shoppingLists.web.dto.UpdateShoppingListItemRequest;
import com.mealflow.appapi.shoppingLists.web.dto.UpdateShoppingListRequest;
import com.mealflow.appapi.shoppingLists.web.mapper.ShoppingListMapper;
import com.mealflow.appapi.shoppingLists.web.mapper.ShoppingListMapper.AddItemArgs;
import com.mealflow.appapi.shoppingLists.web.mapper.ShoppingListMapper.CreateArgs;
import com.mealflow.appapi.shoppingLists.web.mapper.ShoppingListMapper.PatchArgs;
import com.mealflow.appapi.shoppingLists.web.mapper.ShoppingListMapper.UpdateItemArgs;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shopping-lists")
public class ShoppingListController {

    private final ShoppingListService shoppingListService;
    private final CurrentUser currentUser;
    private final ShoppingListMapper mapper;

    public ShoppingListController(
            ShoppingListService shoppingListService, CurrentUser currentUser, ShoppingListMapper mapper) {
        this.shoppingListService = shoppingListService;
        this.currentUser = currentUser;
        this.mapper = mapper;
    }

    @GetMapping
    public List<ShoppingListListItemResponse> list(
            Authentication auth,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "limit", required = false) Integer limit,
            @RequestParam(name = "offset", required = false) Integer offset) {
        String userId = currentUser.userId(auth);
        ShoppingListStatus parsedStatus = parseStatus(status);
        return shoppingListService.listForUser(userId, parsedStatus, limit, offset).stream()
                .map(mapper::toListItem)
                .toList();
    }

    @GetMapping("/{id}")
    public ShoppingListResponse get(@PathVariable String id, Authentication auth) {
        String userId = currentUser.userId(auth);
        return mapper.toResponse(shoppingListService.getForUser(userId, id));
    }

    @PostMapping
    public ResponseEntity<ShoppingListResponse> create(
            @Valid @RequestBody(required = false) CreateShoppingListRequest body,
            @RequestParam(name = "mode", required = false) String mode,
            Authentication auth) {
        String userId = currentUser.userId(auth);
        CreateArgs args = mapper.toCreateArgs(userId, body);
        return ResponseEntity.ok(mapper.toResponse(shoppingListService.createOrMerge(
                args.userId(), args.weeklyPlanId(), parseReplaceMode(mode), args.title())));
    }

    @PatchMapping("/{id}")
    public ShoppingListResponse patch(
            @PathVariable String id, @Valid @RequestBody UpdateShoppingListRequest body, Authentication auth) {
        String userId = currentUser.userId(auth);
        PatchArgs args = mapper.toPatchArgs(userId, id, body);
        return mapper.toResponse(
                shoppingListService.patchList(args.userId(), args.listId(), args.status(), args.title()));
    }

    @PostMapping("/{id}/items")
    public ShoppingListResponse addItem(
            @PathVariable String id, @Valid @RequestBody AddShoppingListItemRequest body, Authentication auth) {
        String userId = currentUser.userId(auth);
        AddItemArgs args = mapper.toAddItemArgs(userId, id, body);
        return mapper.toResponse(
                shoppingListService.addItem(args.userId(), args.listId(), args.name(), args.quantity(), args.unit()));
    }

    @PatchMapping("/{id}/items/{itemId}")
    public ShoppingListResponse patchItem(
            @PathVariable String id,
            @PathVariable String itemId,
            @Valid @RequestBody UpdateShoppingListItemRequest body,
            Authentication auth) {
        String userId = currentUser.userId(auth);
        UpdateItemArgs args = mapper.toUpdateItemArgs(userId, id, itemId, body);
        return mapper.toResponse(shoppingListService.updateItem(
                args.userId(),
                args.listId(),
                args.itemId(),
                args.name(),
                args.quantity(),
                args.unit(),
                args.checked()));
    }

    @DeleteMapping("/{id}/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(@PathVariable String id, @PathVariable String itemId, Authentication auth) {
        String userId = currentUser.userId(auth);
        shoppingListService.deleteItem(userId, id, itemId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id, Authentication auth) {
        String userId = currentUser.userId(auth);
        shoppingListService.deleteList(userId, id);
    }

    private ShoppingListStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return ShoppingListStatus.fromValue(status);
        } catch (IllegalArgumentException ex) {
            throw new ShoppingListValidationException(ex.getMessage());
        }
    }

    private boolean parseReplaceMode(String mode) {
        if (mode == null || mode.isBlank()) {
            return false;
        }
        String normalized = mode.trim().toLowerCase();
        if ("replace".equals(normalized)) {
            return true;
        }
        if ("merge".equals(normalized)) {
            return false;
        }
        throw new ShoppingListValidationException("mode must be merge or replace");
    }
}
