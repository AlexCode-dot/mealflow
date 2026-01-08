package com.mealflow.appapi.recipes.repository;

import com.mealflow.appapi.recipes.domain.Recipe;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RecipeRepository extends MongoRepository<Recipe, String> {

    List<Recipe> findAllByUserId(String userId);

    Optional<Recipe> findByIdAndUserId(String id, String userId);

    long deleteByIdAndUserId(String id, String userId);
}
