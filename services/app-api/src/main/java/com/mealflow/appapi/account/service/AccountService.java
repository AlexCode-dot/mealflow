package com.mealflow.appapi.account.service;

import com.mealflow.appapi.profile.repository.ProfileRepository;
import com.mealflow.appapi.recipes.repository.RecipeRepository;
import com.mealflow.appapi.shoppingLists.repository.ShoppingListRepository;
import com.mealflow.appapi.weeklyPlans.repository.WeeklyPlanRepository;
import org.springframework.stereotype.Service;

@Service
public class AccountService {

    private final ProfileRepository profileRepository;
    private final RecipeRepository recipeRepository;
    private final WeeklyPlanRepository weeklyPlanRepository;
    private final ShoppingListRepository shoppingListRepository;

    public AccountService(
            ProfileRepository profileRepository,
            RecipeRepository recipeRepository,
            WeeklyPlanRepository weeklyPlanRepository,
            ShoppingListRepository shoppingListRepository) {
        this.profileRepository = profileRepository;
        this.recipeRepository = recipeRepository;
        this.weeklyPlanRepository = weeklyPlanRepository;
        this.shoppingListRepository = shoppingListRepository;
    }

    public void deleteAccountData(String userId) {
        shoppingListRepository.deleteByUserId(userId);
        weeklyPlanRepository.deleteByUserId(userId);
        recipeRepository.deleteByUserId(userId);
        profileRepository.deleteByUserId(userId);
    }
}
