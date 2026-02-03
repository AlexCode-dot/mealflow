package com.mealflow.appapi.recipes.web;

import com.mealflow.appapi.recipes.image.RecipeImageService;
import com.mealflow.appapi.recipes.web.dto.RecipeImageUploadResponse;
import com.mealflow.appapi.security.config.CurrentUser;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/recipes")
public class RecipeImageController {

    private final RecipeImageService imageService;
    private final CurrentUser currentUser;

    public RecipeImageController(RecipeImageService imageService, CurrentUser currentUser) {
        this.imageService = imageService;
        this.currentUser = currentUser;
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RecipeImageUploadResponse upload(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "recipeId", required = false) String recipeId,
            Authentication auth) {
        String userId = currentUser.userId(auth);
        var result = imageService.upload(userId, file, recipeId);
        return new RecipeImageUploadResponse(result.url(), result.fileId());
    }
}
