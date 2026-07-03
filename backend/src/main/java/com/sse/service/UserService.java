package com.sse.service;

import com.sse.dto.*;
import com.sse.entity.Organisme;
import com.sse.entity.User;
import com.sse.enums.Role;
import com.sse.enums.UserStatus;
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
    private final AccountActivationService accountActivationService;
    
    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        return createUserWithResult(request).getUser();
    }

    @Transactional
    public UserCreationResult createUserWithResult(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        
        User user = new User();
        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setRole(request.getRole());
        user.setPhone(request.getPhone());
        
        if (request.getRole() == Role.RESPONSABLE) {
            user.setOrganisme(resolveResponsableOrganisme(request.getOrganismeId(), request.getEntrepriseName()));
        }

        boolean hasPassword = request.getPassword() != null && !request.getPassword().isBlank();
        if (hasPassword) {
            user.setPassword(passwordEncoder.encode(request.getPassword().trim()));
            user.setIsActive(true);
            user.setStatus(UserStatus.ACTIVE);
        } else {
            user.setPassword(null);
            user.setIsActive(false);
            user.setStatus(UserStatus.PENDING_ACTIVATION);
        }
        
        User saved = userRepository.save(user);
        log.info("User created: {} with role {}", saved.getEmail(), saved.getRole());

        AccountActivationService.QueuedActivation queuedActivation = hasPassword
            ? null
            : accountActivationService.queueActivationEmail(saved);

        return new UserCreationResult(
            authService.mapToUserResponse(saved),
            queuedActivation != null ? queuedActivation.getEmailJobId() : null,
            queuedActivation != null ? queuedActivation.getExpiresAt() : null
        );
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
            user.setStatus(UserStatus.ACTIVE);
            user.setIsActive(true);
        }
        if (request.getIsActive() != null) {
            user.setIsActive(request.getIsActive());
            if (!request.getIsActive()) {
                user.setStatus(UserStatus.DISABLED);
            } else if (user.getPassword() == null || user.getPassword().isBlank()) {
                user.setStatus(UserStatus.PENDING_ACTIVATION);
            } else {
                user.setStatus(UserStatus.ACTIVE);
            }
        }
        
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
        user.setStatus(UserStatus.DISABLED);
        userRepository.save(user);
    }
    
    @Transactional
    public UserCreationResult resetPassword(UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(null);
        user.setIsActive(false);
        user.setStatus(UserStatus.PENDING_ACTIVATION);
        User saved = userRepository.save(user);
        AccountActivationService.QueuedActivation queuedActivation = accountActivationService.queueActivationEmail(saved);

        return new UserCreationResult(
            authService.mapToUserResponse(saved),
            queuedActivation.getEmailJobId(),
            queuedActivation.getExpiresAt()
        );
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
