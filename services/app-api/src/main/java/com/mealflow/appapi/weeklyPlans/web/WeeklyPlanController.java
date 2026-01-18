package com.mealflow.appapi.weeklyPlans.web;

import com.mealflow.appapi.security.config.CurrentUser;
import com.mealflow.appapi.weeklyPlans.domain.WeeklyPlan;
import com.mealflow.appapi.weeklyPlans.service.WeeklyPlanService;
import com.mealflow.appapi.weeklyPlans.web.dto.CreateWeeklyPlanRequest;
import com.mealflow.appapi.weeklyPlans.web.dto.UpdateWeeklyPlanRequest;
import com.mealflow.appapi.weeklyPlans.web.dto.WeeklyPlanListItemResponse;
import com.mealflow.appapi.weeklyPlans.web.dto.WeeklyPlanResponse;
import com.mealflow.appapi.weeklyPlans.web.mapper.WeeklyPlanMapper;
import com.mealflow.appapi.weeklyPlans.web.mapper.WeeklyPlanMapper.CreateArgs;
import com.mealflow.appapi.weeklyPlans.web.mapper.WeeklyPlanMapper.PatchArgs;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/weekly-plans")
public class WeeklyPlanController {

  private final WeeklyPlanService weeklyPlanService;
  private final CurrentUser currentUser;
  private final WeeklyPlanMapper mapper;

  public WeeklyPlanController(
      WeeklyPlanService weeklyPlanService,
      CurrentUser currentUser,
      WeeklyPlanMapper mapper) {
    this.weeklyPlanService = weeklyPlanService;
    this.currentUser = currentUser;
    this.mapper = mapper;
  }

  @GetMapping
  public List<WeeklyPlanListItemResponse> list(
      Authentication auth,
      @RequestParam(name = "weeklyStart", required = false) String weeklyStart) {
    String userId = currentUser.userId(auth);
    return weeklyPlanService.listForUser(userId, weeklyStart).stream()
        .map(mapper::toListItem)
        .toList();
  }

  @GetMapping("/{id}")
  public WeeklyPlanResponse get(@PathVariable String id, Authentication auth) {
    String userId = currentUser.userId(auth);
    return mapper.toResponse(weeklyPlanService.getForUser(userId, id));
  }

  @PostMapping
  public ResponseEntity<WeeklyPlanResponse> create(
      @Valid @RequestBody CreateWeeklyPlanRequest body,
      Authentication auth) {
    String userId = currentUser.userId(auth);
    CreateArgs args = mapper.toCreateArgs(userId, body);

    WeeklyPlan created = weeklyPlanService.create(args.userId(), args.weeklyStart(), args.entries());

    return ResponseEntity.status(HttpStatus.CREATED)
        .location(URI.create("/api/weekly-plans/" + created.getId()))
        .body(mapper.toResponse(created));
  }

  @PatchMapping("/{id}")
  public WeeklyPlanResponse patch(
      @PathVariable String id,
      @Valid @RequestBody UpdateWeeklyPlanRequest body,
      Authentication auth) {
    String userId = currentUser.userId(auth);
    PatchArgs args = mapper.toPatchArgs(userId, id, body);
    WeeklyPlan updated = weeklyPlanService.patch(
        args.userId(),
        args.planId(),
        args.weeklyStart(),
        args.entries());
    return mapper.toResponse(updated);
  }

  @PutMapping("/{id}")
  public WeeklyPlanResponse replace(
      @PathVariable String id,
      @Valid @RequestBody CreateWeeklyPlanRequest body,
      Authentication auth) {
    String userId = currentUser.userId(auth);
    CreateArgs args = mapper.toCreateArgs(userId, body);
    WeeklyPlan updated = weeklyPlanService.replace(
        args.userId(),
        id,
        args.weeklyStart(),
        args.entries());
    return mapper.toResponse(updated);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable String id, Authentication auth) {
    String userId = currentUser.userId(auth);
    weeklyPlanService.delete(userId, id);
  }
}
