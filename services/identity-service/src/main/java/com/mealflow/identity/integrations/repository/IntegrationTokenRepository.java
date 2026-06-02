package com.mealflow.identity.integrations.repository;

import com.mealflow.identity.integrations.domain.IntegrationToken;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface IntegrationTokenRepository extends MongoRepository<IntegrationToken, String> {

    Optional<IntegrationToken> findByTokenHash(String tokenHash);

    List<IntegrationToken> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<IntegrationToken> findByIdAndUserId(String id, String userId);
}
