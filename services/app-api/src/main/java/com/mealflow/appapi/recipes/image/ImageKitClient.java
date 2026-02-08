package com.mealflow.appapi.recipes.image;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.mealflow.appapi.monitoring.ExternalApiReporter;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.function.Supplier;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImageKitClient {

    private final ImageKitProperties properties;
    private final RestClient uploadClient;
    private final RestClient apiClient;

    public ImageKitClient(ImageKitProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.uploadClient =
                restClientBuilder.baseUrl("https://upload.imagekit.io/api/v1").build();
        this.apiClient = restClientBuilder.baseUrl("https://api.imagekit.io/v1").build();
    }

    public ImageKitUploadResult upload(MultipartFile file, String fileName, String userId) {
        ensureConfigured();

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        HttpHeaders partHeaders = new HttpHeaders();
        if (file.getContentType() != null) {
            partHeaders.setContentType(MediaType.parseMediaType(file.getContentType()));
        }
        body.add("file", new HttpEntity<>(new NamedBytesResource(file, fileName), partHeaders));
        body.add("fileName", fileName);
        body.add("useUniqueFileName", "true");
        body.add("folder", properties.getUploadFolder());
        body.add("tags", "mealflow,recipes,user:" + userId);

        ImageKitUploadResponse response = execute("upload", () -> uploadClient
                .post()
                .uri("/files/upload")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .header("Authorization", "Basic " + basicAuthToken())
                .body(body)
                .retrieve()
                .body(ImageKitUploadResponse.class));

        if (response == null || response.url == null || response.url.isBlank()) {
            throw new ImageUploadValidationException("Image upload failed. Try again.");
        }

        return new ImageKitUploadResult(response.url, response.fileId, response.width, response.height);
    }

    public void delete(String fileId) {
        if (fileId == null || fileId.isBlank()) {
            return;
        }
        ensureConfigured();

        execute("delete", () -> {
            apiClient
                    .delete()
                    .uri("/files/{fileId}", fileId)
                    .header("Authorization", "Basic " + basicAuthToken())
                    .retrieve()
                    .toBodilessEntity();
            return null;
        });
    }

    private void ensureConfigured() {
        if (properties.getPrivateKey() == null || properties.getPrivateKey().isBlank()) {
            throw new ImageUploadValidationException("Image uploads are not configured.");
        }
        if (properties.getUrlEndpoint() == null || properties.getUrlEndpoint().isBlank()) {
            throw new ImageUploadValidationException("Image uploads are not configured.");
        }
        if (properties.getUploadFolder() == null || properties.getUploadFolder().isBlank()) {
            throw new ImageUploadValidationException("Image uploads are not configured.");
        }
    }

    private String basicAuthToken() {
        String token = properties.getPrivateKey() + ":";
        return Base64.getEncoder().encodeToString(token.getBytes(StandardCharsets.UTF_8));
    }

    private <T> T execute(String operation, Supplier<T> action) {
        try {
            return action.get();
        } catch (RestClientException ex) {
            ExternalApiReporter.captureFailure("imagekit", operation, ex);
            throw ex;
        }
    }

    private static class NamedBytesResource extends ByteArrayResource {
        private final String filename;

        private NamedBytesResource(MultipartFile file, String filename) {
            super(toBytes(file));
            this.filename = filename;
        }

        @Override
        public String getFilename() {
            return filename;
        }

        private static byte[] toBytes(MultipartFile file) {
            try {
                return file.getBytes();
            } catch (Exception ex) {
                throw new ImageUploadValidationException("Could not read uploaded image.");
            }
        }
    }

    private static class ImageKitUploadResponse {
        @JsonProperty("url")
        private String url;

        @JsonProperty("fileId")
        private String fileId;

        @JsonProperty("width")
        private Integer width;

        @JsonProperty("height")
        private Integer height;
    }
}
