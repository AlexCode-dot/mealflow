package com.mealflow.identity.oauth.web;

import com.mealflow.identity.audit.domain.AuditEventType;
import com.mealflow.identity.audit.service.AuditService;
import com.mealflow.identity.oauth.service.ConnectionsService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * "Connected apps" in the user's MealFlow account: list which apps (Personal OS) have access and
 * with which scopes, and revoke an app's access (deletes all its grants + consent; app-api stops
 * accepting its access tokens within its grant-cache window).
 */
@RestController
@RequestMapping("/account/connections")
public class ConnectionsController {

    private final ConnectionsService connections;
    private final AuditService auditService;

    public ConnectionsController(ConnectionsService connections, AuditService auditService) {
        this.connections = connections;
        this.auditService = auditService;
    }

    @GetMapping
    public List<ConnectionsService.Connection> list(@AuthenticationPrincipal Jwt jwt) {
        return connections.list(jwt.getSubject());
    }

    @DeleteMapping("/{clientId}")
    public ResponseEntity<Void> revoke(
            @AuthenticationPrincipal Jwt jwt, @PathVariable String clientId, HttpServletRequest request) {
        String userId = jwt.getSubject();
        if (!connections.revoke(userId, clientId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        auditService.log(
                AuditEventType.OAUTH_ACCESS_REVOKED_BY_USER,
                AuditEventType.OUTCOME_SUCCESS,
                userId,
                "oauth_client",
                clientId,
                request,
                Map.of());
        return ResponseEntity.noContent().build();
    }
}
