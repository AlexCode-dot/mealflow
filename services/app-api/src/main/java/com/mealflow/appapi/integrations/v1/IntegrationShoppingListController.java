package com.mealflow.appapi.integrations.v1;

import com.mealflow.appapi.integrations.v1.dto.AddShoppingItemBody;
import com.mealflow.appapi.integrations.v1.dto.ShoppingListDto;
import com.mealflow.appapi.integrations.v1.dto.ShoppingListSummaryDto;
import com.mealflow.appapi.integrations.v1.dto.UpdateShoppingItemBody;
import com.mealflow.appapi.security.oauth.IntegrationTokenClaims;
import com.mealflow.appapi.shoppingLists.domain.ShoppingList;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/integrations/v1/shopping-lists")
public class IntegrationShoppingListController {

    private final IntegrationShoppingListService shoppingLists;
    private final IdempotencyService idempotency;

    public IntegrationShoppingListController(
            IntegrationShoppingListService shoppingLists, IdempotencyService idempotency) {
        this.shoppingLists = shoppingLists;
        this.idempotency = idempotency;
    }

    @GetMapping
    public List<ShoppingListSummaryDto> list(
            Authentication auth, @RequestParam(name = "status", required = false) String status) {
        return shoppingLists.list(IntegrationTokenClaims.from(auth).userId(), status);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShoppingListDto> get(@PathVariable String id, Authentication auth) {
        return respond(
                HttpStatus.OK,
                shoppingLists.get(IntegrationTokenClaims.from(auth).userId(), id));
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<Object> addItem(
            @PathVariable String id,
            @Valid @RequestBody AddShoppingItemBody body,
            @RequestHeader(name = IdempotencyService.HEADER, required = false) String idempotencyKey,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            Authentication auth,
            HttpServletRequest request) {
        IntegrationTokenClaims token = IntegrationTokenClaims.from(auth);
        return idempotency.execute(token, idempotencyKey, request, body, () -> {
            IntegrationShoppingListService.AddedItem added = shoppingLists.addItem(token.userId(), id, body, ifMatch);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .location(URI.create("/integrations/v1/shopping-lists/" + id + "/items/" + added.itemId()))
                    .eTag(Versioning.etag(added.list().getUpdatedAt()))
                    .body(IntegrationShoppingListService.toDto(added.list()));
        });
    }

    @PatchMapping("/{id}/items/{itemId}")
    public ResponseEntity<Object> updateItem(
            @PathVariable String id,
            @PathVariable String itemId,
            @Valid @RequestBody UpdateShoppingItemBody body,
            @RequestHeader(name = IdempotencyService.HEADER, required = false) String idempotencyKey,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            Authentication auth,
            HttpServletRequest request) {
        IntegrationTokenClaims token = IntegrationTokenClaims.from(auth);
        return idempotency.execute(
                token,
                idempotencyKey,
                request,
                body,
                () -> respond(
                        HttpStatus.OK, shoppingLists.setChecked(token.userId(), id, itemId, body.checked(), ifMatch)));
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public ResponseEntity<Object> removeItem(
            @PathVariable String id,
            @PathVariable String itemId,
            @RequestHeader(name = IdempotencyService.HEADER, required = false) String idempotencyKey,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            Authentication auth,
            HttpServletRequest request) {
        IntegrationTokenClaims token = IntegrationTokenClaims.from(auth);
        return idempotency.execute(
                token,
                idempotencyKey,
                request,
                null,
                () -> respond(HttpStatus.OK, shoppingLists.removeItem(token.userId(), id, itemId, ifMatch)));
    }

    private static ResponseEntity<ShoppingListDto> respond(HttpStatus status, ShoppingList list) {
        return ResponseEntity.status(status)
                .eTag(Versioning.etag(list.getUpdatedAt()))
                .body(IntegrationShoppingListService.toDto(list));
    }
}
