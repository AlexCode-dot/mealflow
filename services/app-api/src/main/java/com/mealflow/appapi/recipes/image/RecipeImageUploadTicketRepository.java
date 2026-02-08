package com.mealflow.appapi.recipes.image;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface RecipeImageUploadTicketRepository
        extends MongoRepository<RecipeImageUploadTicket, String> {
    Optional<RecipeImageUploadTicket> findFirstByUserIdAndImageFileIdAndConsumedFalseOrderByCreatedAtDesc(
            String userId, String imageFileId);

    long deleteByCreatedAtBefore(Instant threshold);
}
