package com.mealflow.appapi.recipes.extraction.repository;

import com.mealflow.appapi.recipes.extraction.domain.ExtractionJob;
import com.mealflow.appapi.recipes.extraction.domain.ExtractionStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ExtractionJobRepository extends MongoRepository<ExtractionJob, String> {

    Optional<ExtractionJob> findByIdAndUserId(String id, String userId);

    long countByUserIdAndCreatedAtAfter(String userId, Instant after);

    List<ExtractionJob> findByStatusInAndCreatedAtBefore(List<ExtractionStatus> statuses, Instant before);
}
