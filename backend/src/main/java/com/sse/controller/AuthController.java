package com.sse.controller;

import com.sse.dto.*;
import com.sse.security.CurrentUserService;
import com.sse.service.AuthService;
import com.sse.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {
    
    private final AuthService authService;
    private final JwtUtil jwtUtil;
    private final CurrentUserService currentUserService;
    
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/activate")
    public ResponseEntity<UserResponse> activateAccount(@Valid @RequestBody ActivateAccountRequest request) {
        return ResponseEntity.ok(authService.activateAccount(request.getToken(), request.getPassword()));
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@RequestHeader("X-Refresh-Token") String refreshToken) {
        return ResponseEntity.ok(authService.refreshToken(refreshToken));
    }
    
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(HttpServletRequest request) {
        UUID userId = currentUserService.getCurrentUserId(request);
        return ResponseEntity.ok(authService.getCurrentUser(userId));
    }
    
    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateProfile(
            HttpServletRequest request,
            @RequestBody UpdateUserRequest updateRequest) {
        UUID userId = currentUserService.getCurrentUserId(request);
        return ResponseEntity.ok(authService.updateProfile(userId, updateRequest));
    }
    
    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            HttpServletRequest request,
            @RequestBody ChangePasswordRequest requestDto) {
        UUID userId = currentUserService.getCurrentUserId(request);
        authService.changePassword(userId, requestDto.getOldPassword(), requestDto.getNewPassword());
        return ResponseEntity.ok().build();
    }
    
    @Data
    public static class ChangePasswordRequest {
        private String oldPassword;
        private String newPassword;
    }
}
