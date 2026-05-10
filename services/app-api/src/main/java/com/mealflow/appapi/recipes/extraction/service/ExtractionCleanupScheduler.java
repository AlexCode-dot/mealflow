package com.mealflow.appapi.recipes.extraction.service;

import com.mealflow.appapi.recipes.extraction.config.ExtractionProperties;
import com.mealflow.appapi.recipes.extraction.domain.ExtractionJob;
import com.mealflow.appapi.recipes.extraction.domain.ExtractionStatus;
import com.mealflow.appapi.recipes.extraction.repository.ExtractionJobRepository;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodically removes extraction jobs that were never accepted, along with any
 * thumbnail candidates that were uploaded to ImageKit. Without this, every abandoned
 * extraction would leave 1–8 orphan files in ImageKit forever.
 */
@Component
public class ExtractionCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(ExtractionCleanupScheduler.class);

    /** Statuses we will reclaim — anything that wasn't accepted. */
    private static final List<ExtractionStatus> RECLAIMABLE_STATUSES = List.of(
            ExtractionStatus.PENDING, ExtractionStatus.PROCESSING, ExtractionStatus.READY, ExtractionStatus.FAILED);

    private final ExtractionJobRepository jobRepository;
    private final ExtractionThumbnailService thumbnailService;
    private final ExtractionProperties properties;
    private final Clock clock;

    public ExtractionCleanupScheduler(
            ExtractionJobRepository jobRepository,
            ExtractionThumbnailService thumbnailService,
            ExtractionProperties properties,
            Clock clock) {
        this.jobRepository = jobRepository;
        this.thumbnailService = thumbnailService;
        this.properties = properties;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${app.extraction.cleanup-interval-seconds:600}000")
    public void purgeExpiredJobs() {
        try {
            int ttlMinutes = properties.getJobTtlMinutes();
            if (ttlMinutes <= 0) {
                return;
            }
            var cutoff = clock.instant().minus(Duration.ofMinutes(ttlMinutes));
            List<ExtractionJob> expired = jobRepository.findByStatusInAndCreatedAtBefore(RECLAIMABLE_STATUSES, cutoff);
            if (expired.isEmpty()) {
                return;
            }
            log.info("Cleaning up {} expired extraction job(s)", expired.size());
            for (ExtractionJob job : expired) {
                deleteCandidates(job);
                jobRepository.deleteById(job.getId());
            }
        } catch (RuntimeException ex) {
            // Never let scheduler crash the JVM — just log and try again next tick.
            log.warn("Extraction cleanup run failed: {}", ex.getMessage(), ex);
        }
    }

    private void deleteCandidates(ExtractionJob job) {
        // Image-source extractions auto-upload a thumbnail; if the job is abandoned, delete it.
        // Video-source extractions don't pre-upload anything, so there's nothing to clean up here.
        thumbnailService.deleteThumbnail(job.getUserId(), job.getThumbnailFileId());
    }
}
