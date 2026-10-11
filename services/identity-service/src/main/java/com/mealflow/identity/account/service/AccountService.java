package com.mealflow.identity.account.service;

import com.mealflow.identity.oauth.service.ConnectionsService;
import com.mealflow.identity.token.repository.RefreshTokenRepository;
import com.mealflow.identity.user.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class AccountService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ConnectionsService connectionsService;

    public AccountService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            ConnectionsService connectionsService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.connectionsService = connectionsService;
    }

    public void deleteAccount(String userId) {
        refreshTokenRepository.deleteByUserId(userId);
        connectionsService.removeAll(userId);
        userRepository.deleteById(userId);
    }
}
