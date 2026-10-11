package com.mealflow.appapi.integrations.v1;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;

import com.jayway.jsonpath.JsonPath;
import com.mealflow.appapi.shoppingLists.domain.ShoppingList;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListItem;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListStatus;
import com.mealflow.appapi.shoppingLists.repository.ShoppingListRepository;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class IntegrationShoppingListApiIT extends IntegrationApiTestBase {

    @Autowired
    ShoppingListRepository listRepository;

    private String seedList(String userId, String title) {
        Instant now = Instant.now();
        ShoppingList list = new ShoppingList(
                userId,
                ShoppingListStatus.ACTIVE,
                null,
                title,
                List.of(new ShoppingListItem("item-1", "Eggs", 12.0, "pcs", false)),
                now,
                now);
        return listRepository.save(list).getId();
    }

    @Test
    void listGetAddCheckUncheckRemove() throws Exception {
        String token = token("shop-1", ALL_SCOPES);
        String listId = seedList("shop-1", "Weekly");

        HttpResponse<String> lists = get("/integrations/v1/shopping-lists", token);
        assertThat(lists.statusCode(), is(200));
        assertThat(JsonPath.read(lists.body(), "$"), hasSize(1));
        assertThat(JsonPath.read(lists.body(), "$[0].itemCount"), is(1));
        assertThat(
                JsonPath.read(
                        get("/integrations/v1/shopping-lists?status=archived", token)
                                .body(),
                        "$"),
                hasSize(0));
        assertThat(get("/integrations/v1/shopping-lists?status=bogus", token).statusCode(), is(400));

        HttpResponse<String> got = get("/integrations/v1/shopping-lists/" + listId, token);
        assertThat(got.statusCode(), is(200));
        assertThat(JsonPath.read(got.body(), "$.items[0].name"), is("Eggs"));

        HttpResponse<String> added = send(
                "/integrations/v1/shopping-lists/" + listId + "/items",
                token,
                "POST",
                "{\"name\":\" Milk \",\"quantity\":1,\"unit\":\"l\"}",
                key(),
                etag(got));
        assertThat(added.body(), added.statusCode(), is(201));
        assertThat(JsonPath.read(added.body(), "$.items"), hasSize(2));
        assertThat(JsonPath.read(added.body(), "$.items[1].name"), is("Milk"));
        String milkId = JsonPath.read(added.body(), "$.items[1].id");
        assertThat(
                added.headers().firstValue("Location").orElse(""),
                is("/integrations/v1/shopping-lists/" + listId + "/items/" + milkId));

        HttpResponse<String> checked = send(
                "/integrations/v1/shopping-lists/" + listId + "/items/" + milkId,
                token,
                "PATCH",
                "{\"checked\":true}",
                key(),
                etag(added));
        assertThat(checked.statusCode(), is(200));
        assertThat(JsonPath.read(checked.body(), "$.items[1].checked"), is(true));

        // Stale If-Match -> 412 and no change
        HttpResponse<String> stale = send(
                "/integrations/v1/shopping-lists/" + listId + "/items/" + milkId,
                token,
                "PATCH",
                "{\"checked\":false}",
                key(),
                etag(added));
        assertThat(stale.statusCode(), is(412));
        assertThat(
                listRepository.findById(listId).orElseThrow().getItems().get(1).isChecked(), is(true));

        HttpResponse<String> unchecked = send(
                "/integrations/v1/shopping-lists/" + listId + "/items/" + milkId,
                token,
                "PATCH",
                "{\"checked\":false}",
                key(),
                etag(checked));
        assertThat(unchecked.statusCode(), is(200));
        assertThat(JsonPath.read(unchecked.body(), "$.items[1].checked"), is(false));
        assertThat(etag(unchecked), not(is(etag(checked))));

        assertThat(
                send(
                                "/integrations/v1/shopping-lists/" + listId + "/items/" + milkId,
                                token,
                                "PATCH",
                                "{}",
                                key(),
                                null)
                        .statusCode(),
                is(400));

        HttpResponse<String> removed = send(
                "/integrations/v1/shopping-lists/" + listId + "/items/" + milkId, token, "DELETE", null, key(), null);
        assertThat(removed.statusCode(), is(200));
        assertThat(JsonPath.read(removed.body(), "$.items"), hasSize(1));
        assertThat(
                send(
                                "/integrations/v1/shopping-lists/" + listId + "/items/" + milkId,
                                token,
                                "DELETE",
                                null,
                                key(),
                                null)
                        .statusCode(),
                is(404));
    }

    @Test
    void idempotentAddItem_addsOnce_andDifferentBodyIs422() throws Exception {
        String token = token("shop-idem", ALL_SCOPES);
        String listId = seedList("shop-idem", "Idem");
        String k = key();
        String path = "/integrations/v1/shopping-lists/" + listId + "/items";
        HttpResponse<String> first = post(path, token, "{\"name\":\"Bread\"}", k);
        HttpResponse<String> replay = post(path, token, "{\"name\":\"Bread\"}", k);
        assertThat(first.statusCode(), is(201));
        assertThat(replay.statusCode(), is(201));
        assertThat(replay.body(), is(first.body()));
        assertThat(replay.headers().firstValue("Idempotency-Replayed").orElse(null), is("true"));
        assertThat(post(path, token, "{\"name\":\"Butter\"}", k).statusCode(), is(422));
        assertThat(listRepository.findById(listId).orElseThrow().getItems(), hasSize(2));
    }

    @Test
    void crossUser_cannotReadOrModifyOthersList() throws Exception {
        String b = token("shop-iso-b", ALL_SCOPES);
        String listOfA = seedList("shop-iso-a", "A's list");

        assertThat(JsonPath.read(get("/integrations/v1/shopping-lists", b).body(), "$"), hasSize(0));
        assertThat(get("/integrations/v1/shopping-lists/" + listOfA, b).statusCode(), is(404));
        assertThat(
                post("/integrations/v1/shopping-lists/" + listOfA + "/items", b, "{\"name\":\"x\"}", key())
                        .statusCode(),
                is(404));
        assertThat(
                send(
                                "/integrations/v1/shopping-lists/" + listOfA + "/items/item-1",
                                b,
                                "PATCH",
                                "{\"checked\":true}",
                                key(),
                                null)
                        .statusCode(),
                is(404));
        assertThat(
                send("/integrations/v1/shopping-lists/" + listOfA + "/items/item-1", b, "DELETE", null, key(), null)
                        .statusCode(),
                is(404));
        ShoppingList stored = listRepository.findById(listOfA).orElseThrow();
        assertThat(stored.getItems(), hasSize(1));
        assertThat(stored.getItems().get(0).isChecked(), is(false));
    }
}
