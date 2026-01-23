package com.mealflow.appapi.profile.web.mapper;

import com.mealflow.appapi.profile.domain.Profile;
import com.mealflow.appapi.profile.web.dto.ProfileResponse;
import org.springframework.stereotype.Component;

@Component
public class ProfileMapper {

    public ProfileResponse toResponse(Profile profile) {
        return new ProfileResponse(
                profile.getId(),
                profile.getDisplayName(),
                profile.getAvatarUrl(),
                profile.getTheme(),
                profile.getCreatedAt(),
                profile.getUpdatedAt());
    }
}
