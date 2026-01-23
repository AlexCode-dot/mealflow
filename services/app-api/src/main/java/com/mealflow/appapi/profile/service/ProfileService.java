package com.mealflow.appapi.profile.service;

import com.mealflow.appapi.profile.domain.Profile;
import com.mealflow.appapi.profile.repository.ProfileRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final Clock clock;

    public ProfileService(ProfileRepository profileRepository, Clock clock) {
        this.profileRepository = profileRepository;
        this.clock = clock;
    }

    public Profile getProfile(String userId) {
        return ensureProfile(userId);
    }

    public Profile updateProfile(String userId, String displayName, String avatarUrl, String theme) {
        Profile profile = ensureProfile(userId);
        boolean changed = false;

        if (displayName != null) {
            String normalized = normalizeRequired(displayName, "displayName must not be blank");
            profile.setDisplayName(normalized);
            changed = true;
        }

        if (avatarUrl != null) {
            profile.setAvatarUrl(normalizeOptional(avatarUrl));
            changed = true;
        }

        if (theme != null) {
            String normalized = normalizeRequired(theme, "theme must not be blank");
            profile.setTheme(normalized);
            changed = true;
        }

        if (changed) {
            profile.setUpdatedAt(clock.instant());
            return profileRepository.save(profile);
        }

        return profile;
    }

    private Profile ensureProfile(String userId) {
        Optional<Profile> existing = profileRepository.findByUserId(userId);
        if (existing.isPresent()) {
            return existing.get();
        }

        Instant now = clock.instant();
        Profile profile = new Profile(userId, null, null, null, now, now);
        return profileRepository.save(profile);
    }

    private String normalizeRequired(String value, String errorMessage) {
        if (value == null) {
            throw new ProfileValidationException(errorMessage);
        }
        String normalized = value.trim();
        if (normalized.isBlank()) {
            throw new ProfileValidationException(errorMessage);
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        String normalized = value == null ? "" : value.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
