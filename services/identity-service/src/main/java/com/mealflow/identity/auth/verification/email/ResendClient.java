package com.mealflow.identity.auth.verification.email;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Thin wrapper around the Resend transactional-email API. Designed to fail soft when not
 * configured (in dev), so signup still works without a Resend key. In that case the verification
 * code is logged at INFO level instead of being delivered.
 */
@Service
public class ResendClient {

    private static final Logger log = LoggerFactory.getLogger(ResendClient.class);

    private final ResendProperties properties;
    private final RestClient restClient;

    public ResendClient(ResendProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        factory.setReadTimeout(
                (int) Duration.ofSeconds(properties.getRequestTimeoutSeconds()).toMillis());
        this.restClient = RestClient.builder()
                .baseUrl(properties.getBaseUrl())
                .requestFactory(factory)
                .build();
    }

    /**
     * Send a transactional email. Returns true on a successful send.
     * Returns false if Resend isn't configured (and the email content is logged instead) or
     * if delivery fails. Never throws — email delivery failure must not break the auth flow.
     */
    public boolean send(String toEmail, String subject, String htmlBody, String textBody) {
        if (!properties.isConfigured()) {
            log.warn(
                    "Resend is not configured. Email to <{}> with subject '{}' was not sent. Text body:\n{}",
                    toEmail,
                    subject,
                    textBody);
            return false;
        }
        try {
            SendRequest body = new SendRequest(
                    formatFrom(properties.getFromName(), properties.getFromEmail()),
                    List.of(toEmail),
                    subject,
                    htmlBody,
                    textBody);
            SendResponse response = restClient
                    .post()
                    .uri("/emails")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + properties.getApiKey())
                    .body(body)
                    .retrieve()
                    .body(SendResponse.class);
            if (response == null || response.id == null) {
                log.warn("Resend send to <{}> returned empty response", toEmail);
                return false;
            }
            return true;
        } catch (RestClientException ex) {
            log.warn("Failed to send email via Resend to <{}>: {}", toEmail, ex.getMessage());
            return false;
        }
    }

    private static String formatFrom(String name, String address) {
        if (name == null || name.isBlank()) {
            return address;
        }
        return name + " <" + address + ">";
    }

    private record SendRequest(String from, List<String> to, String subject, String html, String text) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class SendResponse {
        public String id;
    }
}
