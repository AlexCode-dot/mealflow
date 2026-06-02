package com.mealflow.identity.admin.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

/**
 * Matches {@code AdminHealth} in the admin-panel contract.
 *
 * <p>{@code features} advertises which optional admin tabs the panel should
 * surface for this app. Mealflow only implements {@code users}, so the list
 * is empty — the panel uses that to hide the Workspaces/Flags/Broadcast tabs
 * (and skip the upstream calls that would otherwise 401/404 against
 * unimplemented endpoints).
 */
public record AdminHealthResponse(
        boolean ok,
        String version,
        String environment,
        Instant lastDeployAt,
        boolean dbReachable,
        Instant checkedAt,
        @JsonInclude(JsonInclude.Include.NON_NULL) List<String> features) {}
