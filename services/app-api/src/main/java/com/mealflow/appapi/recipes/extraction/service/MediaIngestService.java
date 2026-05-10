package com.mealflow.appapi.recipes.extraction.service;

import com.mealflow.appapi.recipes.extraction.config.ExtractionProperties;
import com.mealflow.appapi.recipes.extraction.domain.ExtractionSourceType;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaIngestService {

    private static final Logger log = LoggerFactory.getLogger(MediaIngestService.class);
    private static final String TMP_DIR_NAME = "mealflow-extraction";

    private final ExtractionProperties properties;
    private final Path workspaceRoot;

    public MediaIngestService(ExtractionProperties properties) throws IOException {
        this.properties = properties;
        this.workspaceRoot = Path.of(System.getProperty("java.io.tmpdir"), TMP_DIR_NAME);
        Files.createDirectories(workspaceRoot);
    }

    public StoredMedia store(MultipartFile file, String jobId) {
        if (file == null || file.isEmpty()) {
            throw new ExtractionValidationException("Please choose a file to upload.");
        }

        String contentType =
                Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
        ExtractionSourceType sourceType = classify(contentType);

        long maxBytes = sourceType == ExtractionSourceType.IMAGE
                ? properties.getMaxImageBytes()
                : properties.getMaxVideoBytes();
        if (file.getSize() > maxBytes) {
            throw new ExtractionValidationException(
                    sourceType == ExtractionSourceType.IMAGE ? "Image is too large." : "Video is too large.");
        }

        try {
            Path target = workspaceRoot.resolve(jobId + suffixFor(contentType));
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return new StoredMedia(target, sourceType, contentType, file.getSize());
        } catch (IOException ex) {
            throw new ExtractionValidationException("Could not read uploaded file.");
        }
    }

    public Path workspaceFor(String jobId) {
        return workspaceRoot.resolve(jobId);
    }

    public void cleanup(StoredMedia media) {
        if (media == null) {
            return;
        }
        try {
            Files.deleteIfExists(media.path());
        } catch (IOException ex) {
            log.warn("Failed to delete temp media file {}", media.path(), ex);
        }
    }

    public void cleanupDirectory(Path dir) {
        if (dir == null || !Files.exists(dir)) {
            return;
        }
        try (var stream = Files.walk(dir)) {
            stream.sorted((a, b) -> b.getNameCount() - a.getNameCount()).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ex) {
                    log.warn("Failed to delete {}", p, ex);
                }
            });
        } catch (IOException ex) {
            log.warn("Failed to walk temp directory {}", dir, ex);
        }
    }

    private ExtractionSourceType classify(String contentType) {
        if (properties.getAllowedImageTypes().contains(contentType)) {
            return ExtractionSourceType.IMAGE;
        }
        if (properties.getAllowedVideoTypes().contains(contentType)) {
            return ExtractionSourceType.VIDEO;
        }
        throw new ExtractionValidationException(
                "Unsupported file type. Upload an image (JPG/PNG/WEBP/HEIC) or video (MP4/MOV/WEBM).");
    }

    private String suffixFor(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/heic", "image/heif" -> ".heic";
            case "video/mp4" -> ".mp4";
            case "video/quicktime" -> ".mov";
            case "video/webm" -> ".webm";
            default -> ".bin";
        };
    }
}
