package com.mealflow.appapi.inspiration.web;

import com.mealflow.appapi.inspiration.service.InspirationService;
import com.mealflow.appapi.inspiration.web.dto.InspirationListItemResponse;
import com.mealflow.appapi.inspiration.web.dto.InspirationRecipeResponse;
import com.mealflow.appapi.inspiration.web.mapper.InspirationMapper;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inspiration")
public class InspirationController {

    private final InspirationService service;
    private final InspirationMapper mapper;

    public InspirationController(InspirationService service, InspirationMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @GetMapping
    public List<InspirationListItemResponse> list(
            @RequestParam(name = "q", required = false) String query,
            @RequestParam(required = false) String ingredient,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) Integer limit) {
        return service.list(query, ingredient, category, area, limit).stream()
                .map(mapper::toListItem)
                .toList();
    }

    @GetMapping("/{id}")
    public InspirationRecipeResponse get(@PathVariable String id) {
        return mapper.toResponse(service.get(id));
    }

    @GetMapping("/random")
    public List<InspirationListItemResponse> random(
            @RequestParam(name = "count", required = false, defaultValue = "6") int count) {
        return service.random(count).stream().map(mapper::toListItem).toList();
    }
}
