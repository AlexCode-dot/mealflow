package com.mealflow.identity.web.auth;

import com.mealflow.identity.auth.AuthService;
import com.mealflow.identity.web.auth.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest body) {
        AuthService.AuthTokens tokens = authService.register(body.email(), body.password());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponse(tokens.accessToken(), tokens.refreshToken()));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest body) {
        AuthService.AuthTokens tokens = authService.login(body.email(), body.password());
        return new AuthResponse(tokens.accessToken(), tokens.refreshToken());
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest body) {
        AuthService.AuthTokens tokens = authService.refresh(body.refreshToken());
        return new AuthResponse(tokens.accessToken(), tokens.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody LogoutRequest body) {
        authService.logout(body.refreshToken());
    }
}
