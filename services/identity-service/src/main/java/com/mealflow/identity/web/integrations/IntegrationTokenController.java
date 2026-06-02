package com.mealflow.identity.web.integrations;

import com.mealflow.identity.integrations.domain.IntegrationToken;
import com.mealflow.identity.integrations.service.IntegrationTokenService;
import com.mealflow.identity.integrations.service.IntegrationTokenService.IssuedIntegrationToken;
import com.mealflow.identity.web.integrations.dto.CreateIntegrationTokenRequest;
import com.mealflow.identity.web.integrations.dto.IntegrationTokenSummaryResponse;
import com.mealflow.identity.web.integrations.dto.IssuedIntegrationTokenResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth/integrations")
public class IntegrationTokenController {

    private final IntegrationTokenService service;

    public IntegrationTokenController(IntegrationTokenService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<IssuedIntegrationTokenResponse> create(
            @Valid @RequestBody CreateIntegrationTokenRequest body, @AuthenticationPrincipal Jwt jwt) {
        IssuedIntegrationToken issued =
                service.issue(jwt.getSubject(), body.name(), body.scopes(), body.expiresInDays());

        IntegrationToken t = issued.token();
        IssuedIntegrationTokenResponse response = new IssuedIntegrationTokenResponse(
                t.getId(),
                t.getName(),
                issued.rawToken(),
                t.getTokenPreview(),
                t.getScopes(),
                t.getCreatedAt(),
                t.getExpiresAt());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public List<IntegrationTokenSummaryResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return service.listForUser(jwt.getSubject()).stream()
                .map(t -> new IntegrationTokenSummaryResponse(
                        t.getId(),
                        t.getName(),
                        t.getTokenPreview(),
                        t.getScopes(),
                        t.getCreatedAt(),
                        t.getLastUsedAt(),
                        t.getRevokedAt(),
                        t.getExpiresAt()))
                .toList();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        service.revoke(jwt.getSubject(), id);
    }
}
