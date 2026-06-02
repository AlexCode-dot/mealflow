package com.mealflow.identity.audit.repository;

import com.mealflow.identity.audit.domain.AuditEvent;
import java.time.Instant;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AuditEventRepository extends MongoRepository<AuditEvent, String>, AuditEventRepositoryCustom {

    long countByCreatedAtAfter(Instant after);
}
