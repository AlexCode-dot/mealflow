package com.mealflow.appapi.recipes.extraction.service;

import com.mealflow.appapi.recipes.extraction.config.ExtractionProperties;
import com.mealflow.appapi.recipes.extraction.repository.ExtractionJobRepository;
import java.time.Clock;
import java.time.Duration;
import org.springframework.stereotype.Service;

@Service
public class ExtractionQuotaService {

    private final ExtractionJobRepository jobRepository;
    private final ExtractionProperties properties;
    private final Clock clock;

    public ExtractionQuotaService(ExtractionJobRepository jobRepository, ExtractionProperties properties, Clock clock) {
        this.jobRepository = jobRepository;
        this.properties = properties;
        this.clock = clock;
    }

    public void enforce(String userId) {
        int limit = properties.getMaxPerDay();
        if (limit <= 0) {
            return;
        }
        long count = jobRepository.countByUserIdAndCreatedAtAfter(
                userId, clock.instant().minus(Duration.ofDays(1)));
        if (count >= limit) {
            throw new ExtractionValidationException("Daily extraction limit reached. Try again tomorrow.");
        }
    }
}
