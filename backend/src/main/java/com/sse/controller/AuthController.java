package com.sse.controller;

import com.sse.dto.*;
import com.sse.security.CurrentUserService;
import com.sse.service.AuthService;
import com.sse.service.UserService;
import com.sse.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthService authService;
    private final JwtUtil jwtUtil;
    private final CurrentUserService currentUserService;
    private final UserService userService;
    
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
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        authService.logout(currentUserService.getCurrentUserId(request));
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
            @Valid @RequestBody ChangePasswordRequest requestDto) {
        UUID userId = currentUserService.getCurrentUserId(request);
        authService.changePassword(userId, requestDto.getOldPassword(), requestDto.getNewPassword());
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        userService.forgotPassword(request.getEmail());
        return ResponseEntity.ok().build();
    }

    @Data
    public static class ChangePasswordRequest {
        @NotBlank(message = "Current password is required")
        private String oldPassword;

        @NotBlank(message = "New password is required")
        @Size(min = 8, message = "New password must be at least 8 characters")
        private String newPassword;
    }
}
