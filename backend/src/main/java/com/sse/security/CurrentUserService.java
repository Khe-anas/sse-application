package com.sse.security;

import com.sse.entity.User;
import com.sse.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    public UUID getCurrentUserId(HttpServletRequest request) {
        Object requestUserId = request.getAttribute("userId");
        if (requestUserId instanceof UUID id) {
            return id;
        }

        return getCurrentUser().getId();
    }

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User is not authenticated");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            return userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        }

        String email = null;
        if (principal instanceof UserDetails userDetails) {
            email = userDetails.getUsername();
        } else if (principal instanceof String value && !"anonymousUser".equals(value)) {
            email = value;
        }

        if (email == null || email.isBlank()) {
            throw new RuntimeException("Authenticated user email not found");
        }

        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
