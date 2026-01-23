package com.mealflow.appapi.profile.web;

import com.mealflow.appapi.profile.service.ProfileService;
import com.mealflow.appapi.profile.web.dto.ProfileResponse;
import com.mealflow.appapi.profile.web.dto.UpdateProfileRequest;
import com.mealflow.appapi.profile.web.mapper.ProfileMapper;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;
    private final ProfileMapper profileMapper;

    public ProfileController(ProfileService profileService, ProfileMapper profileMapper) {
        this.profileService = profileService;
        this.profileMapper = profileMapper;
    }

    @GetMapping
    public ProfileResponse getProfile(@AuthenticationPrincipal Jwt jwt) {
        return profileMapper.toResponse(profileService.getProfile(jwt.getSubject()));
    }

    @PatchMapping
    public ProfileResponse updateProfile(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateProfileRequest request) {
        return profileMapper.toResponse(profileService.updateProfile(
                jwt.getSubject(), request.displayName(), request.avatarUrl(), request.theme()));
    }
}
