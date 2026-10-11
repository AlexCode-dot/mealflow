package com.mealflow.appapi.integrations.v1;

import com.mealflow.appapi.integrations.v1.dto.AddMealPlanEntryBody;
import com.mealflow.appapi.integrations.v1.dto.MealPlanDto;
import com.mealflow.appapi.security.oauth.IntegrationTokenClaims;
import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/integrations/v1/meal-plans")
public class IntegrationMealPlanController {

    private final IntegrationMealPlanService mealPlans;
    private final IdempotencyService idempotency;

    public IntegrationMealPlanController(IntegrationMealPlanService mealPlans, IdempotencyService idempotency) {
        this.mealPlans = mealPlans;
        this.idempotency = idempotency;
    }

    /** {@code week} is {@code current} or {@code next}. */
    @GetMapping("/{week}")
    public ResponseEntity<MealPlanDto> get(@PathVariable String week, Authentication auth) {
        requireWeek(week);
        String userId = IntegrationTokenClaims.from(auth).userId();
        String weekStart = mealPlans.weekStart(week);
        WeeklyPlan plan = mealPlans.find(userId, weekStart);
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        if (plan != null) {
            response.eTag(Versioning.etag(plan.getUpdatedAt()));
        }
        return response.body(mealPlans.toDto(userId, weekStart, plan));
    }

    @PostMapping("/{week}/entries")
    public ResponseEntity<Object> addEntry(
            @PathVariable String week,
            @Valid @RequestBody AddMealPlanEntryBody body,
            @RequestHeader(name = IdempotencyService.HEADER, required = false) String idempotencyKey,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            Authentication auth,
            HttpServletRequest request) {
        requireWeek(week);
        IntegrationTokenClaims token = IntegrationTokenClaims.from(auth);
        return idempotency.execute(token, idempotencyKey, request, body, () -> {
            IntegrationMealPlanService.AddedEntry added = mealPlans.addEntry(token.userId(), week, body, ifMatch);
            WeeklyPlan plan = added.plan();
            return ResponseEntity.status(HttpStatus.CREATED)
                    .location(URI.create("/integrations/v1/meal-plans/" + plan.getId() + "/entries/" + added.entryId()))
                    .eTag(Versioning.etag(plan.getUpdatedAt()))
                    .body(mealPlans.toDto(token.userId(), plan.getWeeklyStart(), plan));
        });
    }

    @DeleteMapping("/{planId}/entries/{entryId}")
    public ResponseEntity<Object> removeEntry(
            @PathVariable String planId,
            @PathVariable String entryId,
            @RequestHeader(name = IdempotencyService.HEADER, required = false) String idempotencyKey,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            Authentication auth,
            HttpServletRequest request) {
        IntegrationTokenClaims token = IntegrationTokenClaims.from(auth);
        return idempotency.execute(token, idempotencyKey, request, null, () -> {
            WeeklyPlan plan = mealPlans.removeEntry(token.userId(), planId, entryId, ifMatch);
            return ResponseEntity.ok()
                    .eTag(Versioning.etag(plan.getUpdatedAt()))
                    .body(mealPlans.toDto(token.userId(), plan.getWeeklyStart(), plan));
        });
    }

    /**
     * Only {@code current} and {@code next} exist. Validated here (not with a path regex) so other
     * values answer 404 problem+json instead of falling through to the global 500 handler.
     */
    private static void requireWeek(String week) {
        if (!"current".equals(week) && !"next".equals(week)) {
            throw IntegrationApiException.notFound("Meal plan week must be 'current' or 'next'");
        }
    }
}
