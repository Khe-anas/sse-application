package com.sse.service;

import com.sse.dto.*;
import com.sse.entity.User;
import com.sse.enums.Role;
import com.sse.repository.UserRepository;
import com.sse.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    
    @Transactional
    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
            
            User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
            
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);
            
            String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
            String refreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail());
            
            return new AuthResponse(accessToken, refreshToken, "Bearer", 
                jwtUtil.getAccessTokenExpiration() / 1000, mapToUserResponse(user));
                
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid email or password");
        }
    }
    
    public AuthResponse refreshToken(String refreshToken) {
        if (!jwtUtil.isRefreshToken(refreshToken)) {
            throw new BadCredentialsException("Invalid refresh token");
        }
        
        String email = jwtUtil.extractUsername(refreshToken);
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new BadCredentialsException("User not found"));
        
        String newAccessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        
        return new AuthResponse(newAccessToken, refreshToken, "Bearer",
            jwtUtil.getAccessTokenExpiration() / 1000, mapToUserResponse(user));
    }
    
    public UserResponse getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToUserResponse(user);
    }
    
    @Transactional
    public UserResponse updateProfile(UUID userId, UpdateUserRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        
        return mapToUserResponse(userRepository.save(user));
    }
    
    @Transactional
    public void changePassword(UUID userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new BadCredentialsException("Old password is incorrect");
        }
        
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
    
    public UserResponse mapToUserResponse(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setFullName(user.getFullName());
        response.setRole(user.getRole());
        response.setPhone(user.getPhone());
        response.setIsActive(user.getIsActive());
        response.setCreatedAt(user.getCreatedAt());
        response.setLastLoginAt(user.getLastLoginAt());
        if (user.getOrganisme() != null) {
            response.setOrganismeId(user.getOrganisme().getId());
            response.setOrganismeName(user.getOrganisme().getName());
        }
        return response;
    }
}
