package com.mealflow.appapi.recipes.repository;

import com.mealflow.appapi.recipes.domain.Recipe;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.domain.Pageable;

public interface RecipeRepository extends MongoRepository<Recipe, String> {

    List<Recipe> findAllByUserIdOrderByCreatedAtDesc(String userId);

    List<Recipe> findAllByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    Optional<Recipe> findByIdAndUserId(String id, String userId);

    List<Recipe> findAllByIdInAndUserId(List<String> ids, String userId);

    long deleteByIdAndUserId(String id, String userId);

    long deleteByUserId(String userId);

    long countByUserIdAndImageUrlNotNull(String userId);
}
