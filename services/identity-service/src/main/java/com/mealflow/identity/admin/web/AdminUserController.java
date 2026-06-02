package com.mealflow.identity.admin.web;

import com.mealflow.identity.admin.service.AdminUserService;
import com.mealflow.identity.admin.web.dto.AdminUserDto;
import com.mealflow.identity.admin.web.dto.DeletionPlanResponse;
import com.mealflow.identity.admin.web.dto.ListUsersResponse;
import com.mealflow.identity.admin.web.dto.UpdateUserRequest;
import com.mealflow.identity.admin.web.dto.UserDetailResponse;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin operations against the user collection. Wire shape matches
 * {@code @admin/contract/users} so the admin panel can talk to mealflow with
 * the same client code it uses for sam-app.
 */
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService service;

    public AdminUserController(AdminUserService service) {
        this.service = service;
    }

    @GetMapping
    public ListUsersResponse list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false, defaultValue = "50") int limit) {
        int clamped = Math.min(Math.max(limit, 1), 100);
        return service.list(search, status, cursor, clamped);
    }

    @GetMapping("/{id}")
    public AdminUserDto get(@PathVariable String id) {
        return service.get(id);
    }

    @GetMapping("/{id}/detail")
    public UserDetailResponse detail(@PathVariable String id) {
        return service.detail(id);
    }

    @GetMapping("/{id}/deletion-plan")
    public DeletionPlanResponse deletionPlan(@PathVariable String id) {
        return service.deletionPlan(id);
    }

    @PatchMapping("/{id}")
    public AdminUserDto update(@PathVariable String id, @Valid @RequestBody UpdateUserRequest body) {
        return service.update(id, body);
    }

    @PostMapping("/{id}/disable")
    public AdminUserDto disable(@PathVariable String id) {
        return service.disable(id);
    }

    @PostMapping("/{id}/enable")
    public AdminUserDto enable(@PathVariable String id) {
        return service.enable(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.softDelete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/force-verify")
    public Map<String, Object> forceVerify(@PathVariable String id) {
        service.forceVerifyEmail(id);
        return Map.of("ok", true);
    }

    @GetMapping("/{id}/export")
    public Map<String, Object> export(@PathVariable String id) {
        return service.exportUser(id);
    }
}
