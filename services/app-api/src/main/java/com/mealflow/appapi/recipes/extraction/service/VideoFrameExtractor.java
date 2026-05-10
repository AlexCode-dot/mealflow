package com.mealflow.appapi.recipes.extraction.service;

import com.mealflow.appapi.recipes.extraction.config.ExtractionProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class VideoFrameExtractor {

    private static final Logger log = LoggerFactory.getLogger(VideoFrameExtractor.class);

    private final ExtractionProperties properties;

    public VideoFrameExtractor(ExtractionProperties properties) {
        this.properties = properties;
    }

    public List<ExtractedFrame> extract(Path videoPath, Path outputDir) {
        try {
            Files.createDirectories(outputDir);

            int interval = properties.getFrameIntervalSeconds();
            int maxFrames = properties.getMaxFrames();
            String pattern = outputDir.resolve("frame_%03d.jpg").toString();

            ProcessBuilder pb = new ProcessBuilder(
                    properties.getFfmpegPath(),
                    "-y",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-t",
                    String.valueOf(properties.getVideoMaxDurationSeconds()),
                    "-i",
                    videoPath.toString(),
                    "-vf",
                    "fps=1/" + interval + ",scale='min(1024,iw)':-2",
                    "-vframes",
                    String.valueOf(maxFrames),
                    "-q:v",
                    "4",
                    pattern);
            pb.redirectErrorStream(true);

            Process process = pb.start();
            boolean finished = process.waitFor(properties.getFfmpegTimeoutSeconds(), TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new ExtractionValidationException("Video processing timed out.");
            }
            if (process.exitValue() != 0) {
                String stderr = new String(process.getInputStream().readAllBytes());
                log.warn("ffmpeg failed (exit {}): {}", process.exitValue(), stderr);
                throw new ExtractionValidationException("Could not process video. Try a different file.");
            }

            try (var stream = Files.list(outputDir)) {
                List<Path> sorted =
                        new ArrayList<>(stream.filter(Files::isRegularFile).toList());
                sorted.sort(Comparator.comparing(Path::getFileName));
                List<ExtractedFrame> frames = new ArrayList<>();
                for (Path p : sorted) {
                    frames.add(new ExtractedFrame(p, "image/jpeg"));
                    if (frames.size() >= maxFrames) {
                        break;
                    }
                }
                if (frames.isEmpty()) {
                    throw new ExtractionValidationException("No frames could be extracted from the video.");
                }
                return frames;
            }
        } catch (ExtractionValidationException ex) {
            throw ex;
        } catch (IOException ex) {
            log.warn("Frame extraction IO failed", ex);
            throw new ExtractionValidationException("Could not process video.");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ExtractionValidationException("Video processing was interrupted.");
        }
    }
}
