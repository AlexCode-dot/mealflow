package com.mealflow.appapi.shoppingLists.repository;

import com.mealflow.appapi.shoppingLists.domain.ShoppingList;
import com.mealflow.appapi.shoppingLists.domain.ShoppingListStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ShoppingListRepository extends MongoRepository<ShoppingList, String> {

    List<ShoppingList> findAllByUserIdOrderByUpdatedAtDesc(String userId);

    List<ShoppingList> findAllByUserIdAndStatusOrderByUpdatedAtDesc(String userId, ShoppingListStatus status);

    Optional<ShoppingList> findByIdAndUserId(String id, String userId);

    Optional<ShoppingList> findFirstByUserIdAndStatusOrderByUpdatedAtDesc(String userId, ShoppingListStatus status);

    long deleteByIdAndUserId(String id, String userId);
}
