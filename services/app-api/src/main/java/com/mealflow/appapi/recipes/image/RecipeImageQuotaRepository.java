package com.mealflow.appapi.recipes.image;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RecipeImageQuotaRepository extends MongoRepository<RecipeImageQuota, String> {

    Optional<RecipeImageQuota> findByUserIdAndDate(String userId, LocalDate date);
}
