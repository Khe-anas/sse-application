package com.sse.service;

import com.sse.dto.*;
import com.sse.entity.EmailJob;
import com.sse.entity.Notification;
import com.sse.entity.Organisme;
import com.sse.entity.User;
import com.sse.enums.EmailJobStatus;
import com.sse.enums.EmailJobType;
import com.sse.enums.Role;
import com.sse.enums.TypeNotification;
import com.sse.enums.UserStatus;
import com.sse.enums.TypeOrganisme;
import com.sse.repository.EmailJobRepository;
import com.sse.repository.NotificationRepository;
import com.sse.repository.OrganismeRepository;
import com.sse.repository.UserRepository;
import com.sse.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
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
    private final CurrentUserService currentUserService;
    private final AuditLogService auditLogService;
    private final EmailJobRepository emailJobRepository;
    private final NotificationRepository notificationRepository;
    
    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        return createUserWithResult(request).getUser();
    }

    @Transactional
    public UserCreationResult createUserWithResult(CreateUserRequest request) {
        if (request.getRole() == Role.ADMIN || request.getRole() == Role.SUPER_ADMIN) {
            User currentUser = currentUserService.getCurrentUser();
            if (currentUser.getRole() != Role.SUPER_ADMIN) {
                throw new RuntimeException("Only SUPER_ADMIN can create users with " + request.getRole() + " role");
            }
        }
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
        auditLogService.log("CREATE", "USER", "Created user " + saved.getEmail() + " with role " + saved.getRole());

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

        User currentUser = currentUserService.getCurrentUser();
        
        if (request.getRole() != null) {
            if (user.getRole() == Role.SUPER_ADMIN && currentUser.getRole() != Role.SUPER_ADMIN) {
                throw new RuntimeException("Only SUPER_ADMIN can modify a SUPER_ADMIN user");
            }
            if ((request.getRole() == Role.ADMIN || request.getRole() == Role.SUPER_ADMIN)
                && currentUser.getRole() != Role.SUPER_ADMIN) {
                throw new RuntimeException("Only SUPER_ADMIN can assign " + request.getRole() + " role");
            }
            if (request.getRole() == Role.SUPER_ADMIN && currentUser.getRole() != Role.SUPER_ADMIN) {
                throw new RuntimeException("Only SUPER_ADMIN can assign SUPER_ADMIN role");
            }
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
            if (!request.getIsActive() && user.getRole() == Role.SUPER_ADMIN) {
                log.warn("Attempt to disable SUPER_ADMIN account: {}", user.getEmail());
                throw new RuntimeException("Cannot disable a SUPER_ADMIN account");
            }
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
        
        User saved = userRepository.save(user);
        auditLogService.log("UPDATE", "USER", "Updated user " + saved.getEmail());
        return authService.mapToUserResponse(saved);
    }
    
    @Transactional
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getRole() == Role.SUPER_ADMIN) {
            throw new RuntimeException("Cannot delete a SUPER_ADMIN user");
        }
        user.setIsActive(false);
        user.setStatus(UserStatus.DISABLED);
        userRepository.save(user);
        auditLogService.log("DELETE", "USER", "Deleted (disabled) user " + user.getEmail());
    }
    
    @Transactional
    public UserCreationResult resetPassword(UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(null);
        user.setIsActive(false);
        user.setStatus(UserStatus.PENDING_ACTIVATION);
        User saved = userRepository.save(user);
        auditLogService.log("RESET_PASSWORD", "USER", "Password reset for user " + saved.getEmail());
        AccountActivationService.QueuedActivation queuedActivation = accountActivationService.queueActivationEmail(saved);

        return new UserCreationResult(
            authService.mapToUserResponse(saved),
            queuedActivation.getEmailJobId(),
            queuedActivation.getExpiresAt()
        );
    }

    @Transactional
    public void forgotPassword(String email) {
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            log.info("Forgot password requested for non-existent email: {}", email);
            return;
        }

        List<User> admins = userRepository.findByRoleInAndIsActiveTrue(List.of(Role.ADMIN, Role.SUPER_ADMIN));
        for (User admin : admins) {
            Notification notif = new Notification();
            notif.setUser(admin);
            notif.setType(TypeNotification.SYSTEM);
            notif.setTitleFr("Demande de réinitialisation de mot de passe");
            notif.setTitleAr("طلب إعادة تعيين كلمة المرور");
            notif.setTitleEn("Password reset request");
            notif.setMessageFr("L'utilisateur " + user.getEmail() + " (" + user.getFullName() + ") a demandé la réinitialisation de son mot de passe.");
            notif.setMessageAr("طلب المستخدم " + user.getEmail() + " (" + user.getFullName() + ") إعادة تعيين كلمة المرور.");
            notif.setMessageEn("User " + user.getEmail() + " (" + user.getFullName() + ") has requested a password reset.");
            notif.setLink("/admin/users");
            notif.setIsRead(false);
            notificationRepository.save(notif);
        }

        log.info("Password reset notification sent to admins for user: {}", user.getEmail());
    }

    @Transactional
    public void generatePassword(UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        String rawPassword = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setStatus(UserStatus.ACTIVE);
        user.setIsActive(true);
        userRepository.save(user);

        auditLogService.log("GENERATE_PASSWORD", "USER", "Generated new password for user " + user.getEmail());

        String body = """
            Bonjour %s,

            Un nouveau mot de passe a été généré pour votre compte SSE par l'administration.

            Identifiant : %s
            Mot de passe : %s

            Veuillez vous connecter et changer votre mot de passe dès que possible.

            -----

            Hello %s,

            A new password has been generated for your SSE account by the administration.

            Username: %s
            Password: %s

            Please log in and change your password as soon as possible.
            """.formatted(user.getFullName(), user.getEmail(), rawPassword,
                          user.getFullName(), user.getEmail(), rawPassword);

        EmailJob job = new EmailJob();
        job.setType(EmailJobType.PASSWORD_RESET);
        job.setStatus(EmailJobStatus.PENDING);
        job.setUser(user);
        job.setToEmail(user.getEmail());
        job.setSubject("Your new SSE password / Votre nouveau mot de passe SSE");
        job.setBody(body);
        job.setAttempts(0);
        job.setMaxAttempts(5);
        job.setNextAttemptAt(LocalDateTime.now());
        emailJobRepository.save(job);

        log.info("New password generated and email queued for user: {}", user.getEmail());
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
