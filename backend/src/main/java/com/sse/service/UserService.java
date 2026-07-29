package com.sse.service;

import com.sse.dto.*;
import com.sse.entity.EmailJob;
import com.sse.entity.Notification;
import com.sse.entity.Organisme;
import com.sse.entity.RoleDefinition;
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
import com.sse.repository.RoleDefinitionRepository;
import com.sse.repository.UserRepository;
import com.sse.security.PermissionAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
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
    private final AuditLogService auditLogService;
    private final EmailJobRepository emailJobRepository;
    private final NotificationRepository notificationRepository;
    private final FileStorageService fileStorageService;
    private final SecteurCatalogService secteurCatalogService;
    private final RoleDefinitionRepository roleDefinitionRepository;
    private final PermissionAccessService permissionAccessService;
    private final CatalogueLookupService catalogueLookupService;
    
    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        return createUserWithResult(request).getUser();
    }

    @Transactional
    public UserCreationResult createUserWithResult(CreateUserRequest request) {
        RoleDefinition roleDefinition = resolveRoleDefinition(
            request.getRoleDefinitionId(),
            request.getRole()
        );
        if (request.getRoleDefinitionId() != null && !permissionAccessService.isSystemAdmin()) {
            throw new RuntimeException("Seul l'administrateur système peut attribuer un rôle fonctionnel");
        }
        if (isSystemAdminRole(roleDefinition) && !permissionAccessService.isSystemAdmin()) {
            throw new RuntimeException("Seul l'administrateur système peut attribuer ce rôle");
        }
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new RuntimeException("Email already exists");
        }
        
        User user = new User();
        user.setEmail(email);
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setRole(roleDefinition.getBaseRole());
        user.setRoleDefinition(roleDefinition);
        user.setPhone(normalizeNullable(request.getPhone()));
        user.setPosition(normalizeNullable(request.getPosition()));

        if (user.getRole() == Role.USER) {
            user.setOrganisme(resolveUserOrganisme(request.getOrganismeId(), request.getEntrepriseName()));
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

    @Transactional
    public UserResponse createUserWithOrganisme(CreateUserWithOrganismeRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new RuntimeException("Email already exists");
        }

        String organisationName = request.getOrganisationName().trim();
        if (organismeRepository.findActiveByNameIgnoreCase(organisationName).isPresent()) {
            throw new RuntimeException("An active organization with this name already exists");
        }

        String logoUrl = fileStorageService.storeImage(request.getLogo());
        try {
            Organisme organisme = new Organisme();
            organisme.setName(organisationName);
            organisme.setType(request.getOrganisationType());
            var organisationTypeDefinition = catalogueLookupService.resolveType(
                request.getOrganisationTypeDefinitionId(),
                request.getOrganisationType()
            );
            organisme.setType(organisationTypeDefinition.getBaseType());
            organisme.setTypeDefinition(organisationTypeDefinition);
            organisme.setSector(secteurCatalogService.normalizeAndEnsure(request.getSector()));
            organisme.setAddress(normalizeNullable(request.getAddress()));
            organisme.setEmail(normalizeNullable(request.getOrganisationEmail()));
            organisme.setPhone(normalizeNullable(request.getOrganisationPhone()));
            organisme.setFax(normalizeNullable(request.getFax()));
            organisme.setWebsite(normalizeNullable(request.getWebsite()));
            organisme.setLogoUrl(logoUrl);
            organisme.setIsActive(true);
            Organisme savedOrganisme = organismeRepository.save(organisme);

            CreateUserRequest createUserRequest = new CreateUserRequest();
            createUserRequest.setEmail(email);
            createUserRequest.setFirstName(request.getFirstName().trim());
            createUserRequest.setLastName(request.getLastName().trim());
            createUserRequest.setPassword(request.getPassword());
            createUserRequest.setPhone(request.getPhone());
            createUserRequest.setPosition(request.getPosition());
            createUserRequest.setRole(Role.USER);
            createUserRequest.setOrganismeId(savedOrganisme.getId());
            return createUserWithResult(createUserRequest).getUser();
        } catch (RuntimeException exception) {
            fileStorageService.delete(logoUrl);
            throw exception;
        }
    }
    
    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(Role role, UserStatus status, UUID organismeId, String search, Pageable pageable) {
        String normalizedSearch = search != null && !search.isBlank() ? search.trim() : null;
        Page<User> users = normalizedSearch == null
            ? userRepository.findAllWithFilters(role, status, organismeId, pageable)
            : userRepository.findAllWithSearch(role, status, organismeId, normalizedSearch, pageable);

        return users.map(authService::mapToUserResponse);
    }
    
    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return authService.mapToUserResponse(user);
    }
    
    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        ensureCanManageUser(user);

        if (request.getFirstName() != null) user.setFirstName(request.getFirstName().trim());
        if (request.getLastName() != null) user.setLastName(request.getLastName().trim());
        if (request.getRole() != null || request.getRoleDefinitionId() != null) {
            if (request.getRoleDefinitionId() != null && !permissionAccessService.isSystemAdmin()) {
                throw new RuntimeException("Seul l'administrateur système peut modifier un rôle fonctionnel");
            }
            Role fallbackRole = request.getRole() != null ? request.getRole() : user.getRole();
            RoleDefinition roleDefinition = resolveRoleDefinition(
                request.getRoleDefinitionId(),
                fallbackRole
            );
            if (isSystemAdminRole(roleDefinition) && !permissionAccessService.isSystemAdmin()) {
                throw new RuntimeException("Seul l'administrateur système peut attribuer ce rôle");
            }
            if (isSystemAdminUser(user) && !isSystemAdminRole(roleDefinition)) {
                ensureAnotherSystemAdminExists(user);
            }
            user.setRole(roleDefinition.getBaseRole());
            user.setRoleDefinition(roleDefinition);
            if (roleDefinition.getBaseRole() != Role.USER) {
                user.setOrganisme(null);
            }
        }
        if (request.getPhone() != null) user.setPhone(normalizeNullable(request.getPhone()));
        if (request.getPosition() != null) user.setPosition(normalizeNullable(request.getPosition()));
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setStatus(UserStatus.ACTIVE);
            user.setIsActive(true);
        }
        if (request.getIsActive() != null) {
            if (!request.getIsActive()) {
                if (isSystemAdminUser(user)) {
                    ensureAnotherSystemAdminExists(user);
                }
                user.setIsActive(false);
                user.setStatus(UserStatus.DISABLED);
            } else if (user.getPassword() == null || user.getPassword().isBlank()) {
                user.setIsActive(false);
                user.setStatus(UserStatus.PENDING_ACTIVATION);
            } else {
                user.setIsActive(true);
                user.setStatus(UserStatus.ACTIVE);
            }
        }
        
        if (user.getRole() == Role.USER && request.getOrganismeId() != null) {
            Organisme org = organismeRepository.findById(request.getOrganismeId())
                .orElseThrow(() -> new RuntimeException("Organisme not found"));
            user.setOrganisme(org);
        }

        if (user.getRole() == Role.USER && user.getOrganisme() == null) {
            throw new RuntimeException("A user must be assigned to an organisme");
        }
        
        User saved = userRepository.save(user);
        auditLogService.log("UPDATE", "USER", "Updated user " + saved.getEmail());
        return authService.mapToUserResponse(saved);
    }
    
    @Transactional
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        ensureCanManageUser(user);
        if (isSystemAdminUser(user)) {
            ensureAnotherSystemAdminExists(user);
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
        ensureCanManageUser(user);

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

        List<User> admins = userRepository.findActiveSystemAdmins();
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
        ensureCanManageUser(user);

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

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private RoleDefinition resolveRoleDefinition(UUID definitionId, Role fallbackRole) {
        RoleDefinition definition;
        if (definitionId != null) {
            definition = roleDefinitionRepository.findById(definitionId)
                .orElseThrow(() -> new RuntimeException("Rôle introuvable"));
        } else {
            definition = roleDefinitionRepository.findBySystemRoleTrueAndBaseRole(fallbackRole)
                .orElseThrow(() -> new RuntimeException("Rôle système introuvable"));
        }
        if (!Boolean.TRUE.equals(definition.getActive())) {
            throw new RuntimeException("Ce rôle est désactivé");
        }
        return definition;
    }

    private boolean isSystemAdminRole(RoleDefinition definition) {
        return Boolean.TRUE.equals(definition.getSystemRole())
            && "ADMIN".equals(definition.getCode());
    }

    private boolean isSystemAdminUser(User user) {
        return user.getRole() == Role.ADMIN
            && (
                user.getRoleDefinition() == null
                || isSystemAdminRole(user.getRoleDefinition())
            );
    }

    private void ensureCanManageUser(User user) {
        if (isSystemAdminUser(user) && !permissionAccessService.isSystemAdmin()) {
            throw new RuntimeException("Seul un administrateur système peut modifier ce compte");
        }
    }

    private void ensureAnotherSystemAdminExists(User user) {
        RoleDefinition definition = user.getRoleDefinition();
        if (definition == null) {
            throw new RuntimeException("Le compte administrateur historique ne peut pas être désactivé");
        }
        if (userRepository.countByRoleDefinitionIdAndIsActiveTrue(definition.getId()) <= 1) {
            throw new RuntimeException("Au moins un administrateur système actif doit être conservé");
        }
    }

    private Organisme resolveUserOrganisme(UUID organismeId, String entrepriseName) {
        if (organismeId != null) {
            return organismeRepository.findById(organismeId)
                .orElseThrow(() -> new RuntimeException("Organisme not found"));
        }

        String normalizedName = entrepriseName != null ? entrepriseName.trim() : "";
        if (normalizedName.isBlank()) {
            throw new RuntimeException("A user must be assigned to an organisme or a new entreprise name");
        }

        return organismeRepository.findActiveByNameIgnoreCase(normalizedName)
            .orElseGet(() -> {
                Organisme organisme = new Organisme();
                organisme.setName(normalizedName);
                organisme.setType(TypeOrganisme.PRIVE);
                organisme.setTypeDefinition(
                    catalogueLookupService.resolveType(null, TypeOrganisme.PRIVE)
                );
                return organismeRepository.save(organisme);
            });
    }
}
