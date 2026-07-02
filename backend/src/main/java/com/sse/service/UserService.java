package com.sse.service;

import com.sse.dto.*;
import com.sse.entity.Organisme;
import com.sse.entity.User;
import com.sse.enums.Role;
import com.sse.enums.TypeOrganisme;
import com.sse.repository.OrganismeRepository;
import com.sse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    private final OrganismeRepository organismeRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    
    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        
        User user = new User();
        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setRole(request.getRole());
        user.setPhone(request.getPhone());
        
        // Generate random password if not provided
        String password = request.getPassword() != null && !request.getPassword().isBlank()
            ? request.getPassword()
            : generateRandomPassword();
        user.setPassword(passwordEncoder.encode(password));
        
        if (request.getRole() == Role.RESPONSABLE) {
            user.setOrganisme(resolveResponsableOrganisme(request.getOrganismeId(), request.getEntrepriseName()));
        }
        
        User saved = userRepository.save(user);
        log.info("User created: {} with role {}", saved.getEmail(), saved.getRole());
        
        // TODO: Send email with generated password
        
        return authService.mapToUserResponse(saved);
    }
    
    public Page<UserResponse> getAllUsers(Role role, UUID organismeId, String search, Pageable pageable) {
        String normalizedSearch = search != null && !search.isBlank() ? search.trim() : null;
        Page<User> users = normalizedSearch == null
            ? userRepository.findAllWithFilters(role, organismeId, pageable)
            : userRepository.findAllWithSearch(role, organismeId, normalizedSearch, pageable);

        return users.map(authService::mapToUserResponse);
    }
    
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return authService.mapToUserResponse(user);
    }
    
    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getRole() != null) {
            user.setRole(request.getRole());
            if (request.getRole() != Role.RESPONSABLE) {
                user.setOrganisme(null);
            }
        }
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getIsActive() != null) user.setIsActive(request.getIsActive());
        
        if (user.getRole() == Role.RESPONSABLE && request.getOrganismeId() != null) {
            Organisme org = organismeRepository.findById(request.getOrganismeId())
                .orElseThrow(() -> new RuntimeException("Organisme not found"));
            user.setOrganisme(org);
        }

        if (user.getRole() == Role.RESPONSABLE && user.getOrganisme() == null) {
            throw new RuntimeException("A responsable d'entreprise must be assigned to an organisme");
        }
        
        return authService.mapToUserResponse(userRepository.save(user));
    }
    
    @Transactional
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsActive(false);
        userRepository.save(user);
    }
    
    @Transactional
    public String resetPassword(UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        String newPassword = generateRandomPassword();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        // TODO: Send email with new password
        return newPassword;
    }
    
    private String generateRandomPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
        StringBuilder sb = new StringBuilder();
        java.util.Random random = new java.util.Random();
        for (int i = 0; i < 12; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    private Organisme resolveResponsableOrganisme(UUID organismeId, String entrepriseName) {
        if (organismeId != null) {
            return organismeRepository.findById(organismeId)
                .orElseThrow(() -> new RuntimeException("Organisme not found"));
        }

        String normalizedName = entrepriseName != null ? entrepriseName.trim() : "";
        if (normalizedName.isBlank()) {
            throw new RuntimeException("A responsable d'entreprise must be assigned to an organisme or a new entreprise name");
        }

        return organismeRepository.findActiveByNameIgnoreCase(normalizedName)
            .orElseGet(() -> {
                Organisme organisme = new Organisme();
                organisme.setName(normalizedName);
                organisme.setType(TypeOrganisme.PRIVE);
                return organismeRepository.save(organisme);
            });
    }
}
