package com.mealflow.appapi.profile.repository;

import com.mealflow.appapi.profile.domain.Profile;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProfileRepository extends MongoRepository<Profile, String> {

    Optional<Profile> findByUserId(String userId);
}
