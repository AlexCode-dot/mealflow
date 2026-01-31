package com.mealflow.identity.account.service;

import com.mealflow.identity.token.repository.RefreshTokenRepository;
import com.mealflow.identity.user.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class AccountService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    public AccountService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
    }

    public void deleteAccount(String userId) {
        refreshTokenRepository.deleteByUserId(userId);
        userRepository.deleteById(userId);
    }
}
