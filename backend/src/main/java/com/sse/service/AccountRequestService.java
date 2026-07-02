package com.sse.service;

import com.sse.dto.AccountRequestResponse;
import com.sse.dto.AccountRequestSubmitRequest;
import com.sse.dto.ApproveAccountRequest;
import com.sse.dto.ApproveAccountRequestResponse;
import com.sse.dto.CreateUserRequest;
import com.sse.dto.RejectAccountRequest;
import com.sse.dto.UserResponse;
import com.sse.entity.AccountRequest;
import com.sse.entity.Organisme;
import com.sse.entity.User;
import com.sse.enums.AccountRequestStatus;
import com.sse.enums.Role;
import com.sse.enums.TypeOrganisme;
import com.sse.exception.ResourceLockedException;
import com.sse.repository.AccountRequestRepository;
import com.sse.repository.OrganismeRepository;
import com.sse.repository.UserRepository;
import com.sse.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccountRequestService {

    private static final int MAX_VERIFICATION_FILES = 5;

    private final AccountRequestRepository accountRequestRepository;
    private final UserRepository userRepository;
    private final OrganismeRepository organismeRepository;
    private final FileStorageService fileStorageService;
    private final UserService userService;
    private final NotificationService notificationService;
    private final AccountRequestEmailService accountRequestEmailService;
    private final CurrentUserService currentUserService;

    @Transactional
    public AccountRequestResponse submit(AccountRequestSubmitRequest request) {
        String email = normalize(request.getCompanyEmail()).toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("An active account already exists for this email");
        }
        if (accountRequestRepository.existsByCompanyEmailIgnoreCaseAndStatus(email, AccountRequestStatus.PENDING)) {
            throw new RuntimeException("A pending account request already exists for this email");
        }

        AccountRequest accountRequest = new AccountRequest();
        accountRequest.setCompanyName(normalize(request.getCompanyName()));
        accountRequest.setType(request.getType());
        accountRequest.setResponsibleFirstName(normalize(request.getResponsibleFirstName()));
        accountRequest.setResponsibleLastName(normalize(request.getResponsibleLastName()));
        accountRequest.setCompanyEmail(email);
        accountRequest.setPhone(normalizeNullable(request.getPhone()));
        accountRequest.setAddress(normalizeNullable(request.getAddress()));
        accountRequest.setSector(normalizeNullable(request.getSector()));
        accountRequest.setMessage(normalizeNullable(request.getMessage()));
        accountRequest.setVerificationFiles(storeFiles(request.getVerificationFiles()));
        accountRequest.setStatus(AccountRequestStatus.PENDING);

        AccountRequest saved = accountRequestRepository.save(accountRequest);
        notificationService.sendAccountRequestSubmitted(saved.getId(), saved.getCompanyName());
        log.info("Account request submitted for {}", saved.getCompanyEmail());
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<AccountRequestResponse> getAll(AccountRequestStatus status, String search, Pageable pageable) {
        String normalizedSearch = search != null && !search.isBlank() ? search.trim() : null;
        if (normalizedSearch == null) {
            Page<AccountRequest> result = status != null
                ? accountRequestRepository.findByStatus(status, pageable)
                : accountRequestRepository.findAll(pageable);
            return result.map(this::mapToResponse);
        }
        return accountRequestRepository.findAllWithFilters(status, normalizedSearch, pageable)
            .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public AccountRequestResponse getById(UUID id) {
        return mapToResponse(findById(id));
    }

    @Transactional
    public AccountRequestResponse claimForReview(UUID id) {
        User admin = currentUserService.getCurrentUser();
        AccountRequest accountRequest = accountRequestRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new RuntimeException("Account request not found"));

        claimForAdmin(accountRequest, admin);
        return mapToResponse(accountRequestRepository.save(accountRequest));
    }

    @Transactional
    public ApproveAccountRequestResponse approve(UUID id, ApproveAccountRequest request) {
        User admin = currentUserService.getCurrentUser();
        AccountRequest accountRequest = accountRequestRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new RuntimeException("Account request not found"));
        if (accountRequest.getStatus() != AccountRequestStatus.PENDING) {
            throw new RuntimeException("Only pending account requests can be approved");
        }
        claimForAdmin(accountRequest, admin);
        if (userRepository.existsByEmail(accountRequest.getCompanyEmail())) {
            throw new RuntimeException("A user already exists for this email");
        }

        Organisme organisme = resolveOrganisme(accountRequest);
        String temporaryPassword = request.getPassword() != null && !request.getPassword().isBlank()
            ? request.getPassword().trim()
            : generateTemporaryPassword();

        CreateUserRequest createUserRequest = new CreateUserRequest();
        createUserRequest.setEmail(accountRequest.getCompanyEmail());
        createUserRequest.setFirstName(accountRequest.getResponsibleFirstName());
        createUserRequest.setLastName(accountRequest.getResponsibleLastName());
        createUserRequest.setPhone(accountRequest.getPhone());
        createUserRequest.setRole(Role.RESPONSABLE);
        createUserRequest.setPassword(temporaryPassword);
        createUserRequest.setOrganismeId(organisme.getId());

        UserResponse userResponse = userService.createUser(createUserRequest);
        User createdUser = userRepository.findById(userResponse.getId())
            .orElseThrow(() -> new RuntimeException("Created user not found"));

        accountRequest.setStatus(AccountRequestStatus.APPROVED);
        accountRequest.setAdminComment(normalizeNullable(request.getAdminComment()));
        accountRequest.setProcessedAt(LocalDateTime.now());
        accountRequest.setCreatedOrganisme(organisme);
        accountRequest.setCreatedUser(createdUser);

        AccountRequest saved = accountRequestRepository.save(accountRequest);
        accountRequestEmailService.sendApproved(saved, userResponse, temporaryPassword);
        return new ApproveAccountRequestResponse(mapToResponse(saved), userResponse, temporaryPassword);
    }

    @Transactional
    public AccountRequestResponse reject(UUID id, RejectAccountRequest request) {
        User admin = currentUserService.getCurrentUser();
        AccountRequest accountRequest = accountRequestRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new RuntimeException("Account request not found"));
        if (accountRequest.getStatus() != AccountRequestStatus.PENDING) {
            throw new RuntimeException("Only pending account requests can be rejected");
        }
        claimForAdmin(accountRequest, admin);

        accountRequest.setStatus(AccountRequestStatus.REJECTED);
        accountRequest.setAdminComment(normalize(request.getAdminComment()));
        accountRequest.setProcessedAt(LocalDateTime.now());
        AccountRequest saved = accountRequestRepository.save(accountRequest);
        accountRequestEmailService.sendRejected(saved, saved.getAdminComment());
        return mapToResponse(saved);
    }

    public long countPending() {
        return accountRequestRepository.countByStatus(AccountRequestStatus.PENDING);
    }

    private Organisme resolveOrganisme(AccountRequest accountRequest) {
        return organismeRepository.findActiveByNameIgnoreCase(accountRequest.getCompanyName())
            .map(existing -> updateOrganisme(existing, accountRequest))
            .orElseGet(() -> createOrganisme(accountRequest));
    }

    private Organisme createOrganisme(AccountRequest accountRequest) {
        Organisme organisme = new Organisme();
        organisme.setName(accountRequest.getCompanyName());
        organisme.setType(accountRequest.getType() != null ? accountRequest.getType() : TypeOrganisme.PRIVE);
        organisme.setSector(accountRequest.getSector());
        organisme.setAddress(accountRequest.getAddress());
        organisme.setEmail(accountRequest.getCompanyEmail());
        organisme.setPhone(accountRequest.getPhone());
        organisme.setIsActive(true);
        return organismeRepository.save(organisme);
    }

    private Organisme updateOrganisme(Organisme organisme, AccountRequest accountRequest) {
        organisme.setType(accountRequest.getType() != null ? accountRequest.getType() : organisme.getType());
        organisme.setSector(accountRequest.getSector() != null ? accountRequest.getSector() : organisme.getSector());
        organisme.setAddress(accountRequest.getAddress() != null ? accountRequest.getAddress() : organisme.getAddress());
        organisme.setEmail(accountRequest.getCompanyEmail());
        organisme.setPhone(accountRequest.getPhone() != null ? accountRequest.getPhone() : organisme.getPhone());
        return organismeRepository.save(organisme);
    }

    private AccountRequest findById(UUID id) {
        return accountRequestRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Account request not found"));
    }

    private void claimForAdmin(AccountRequest accountRequest, User admin) {
        if (accountRequest.getStatus() != AccountRequestStatus.PENDING) {
            throw new RuntimeException("Only pending account requests can be reviewed");
        }

        User reviewer = accountRequest.getReviewedBy();
        if (reviewer == null) {
            accountRequest.setReviewedBy(admin);
            accountRequest.setReviewStartedAt(LocalDateTime.now());
            return;
        }

        if (!reviewer.getId().equals(admin.getId())) {
            throw new ResourceLockedException("Cette demande est deja ouverte par " + reviewer.getFullName());
        }
    }

    private List<String> storeFiles(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new RuntimeException("Ajoutez au moins un fichier PDF de vérification");
        }

        List<MultipartFile> usableFiles = files.stream()
            .filter(file -> file != null && !file.isEmpty())
            .toList();

        if (usableFiles.isEmpty()) {
            throw new RuntimeException("Ajoutez au moins un fichier PDF de vérification");
        }

        if (usableFiles.size() > MAX_VERIFICATION_FILES) {
            throw new RuntimeException("Vous pouvez joindre au maximum " + MAX_VERIFICATION_FILES + " fichiers PDF");
        }

        return usableFiles.stream()
            .map(fileStorageService::storePdf)
            .toList();
    }

    private AccountRequestResponse mapToResponse(AccountRequest accountRequest) {
        AccountRequestResponse response = new AccountRequestResponse();
        response.setId(accountRequest.getId());
        response.setCompanyName(accountRequest.getCompanyName());
        response.setType(accountRequest.getType() != null ? accountRequest.getType() : TypeOrganisme.PRIVE);
        response.setResponsibleFirstName(accountRequest.getResponsibleFirstName());
        response.setResponsibleLastName(accountRequest.getResponsibleLastName());
        response.setResponsibleFullName(accountRequest.getResponsibleFullName());
        response.setCompanyEmail(accountRequest.getCompanyEmail());
        response.setPhone(accountRequest.getPhone());
        response.setAddress(accountRequest.getAddress());
        response.setSector(accountRequest.getSector());
        response.setMessage(accountRequest.getMessage());
        response.setVerificationFiles(accountRequest.getVerificationFiles());
        response.setStatus(accountRequest.getStatus());
        response.setAdminComment(accountRequest.getAdminComment());
        response.setProcessedAt(accountRequest.getProcessedAt());
        response.setReviewStartedAt(accountRequest.getReviewStartedAt());
        response.setCreatedAt(accountRequest.getCreatedAt());
        response.setUpdatedAt(accountRequest.getUpdatedAt());

        if (accountRequest.getReviewedBy() != null) {
            response.setReviewedById(accountRequest.getReviewedBy().getId());
            response.setReviewedByName(accountRequest.getReviewedBy().getFullName());
        }
        if (accountRequest.getCreatedUser() != null) {
            response.setCreatedUserId(accountRequest.getCreatedUser().getId());
        }
        if (accountRequest.getCreatedOrganisme() != null) {
            response.setCreatedOrganismeId(accountRequest.getCreatedOrganisme().getId());
            response.setCreatedOrganismeName(accountRequest.getCreatedOrganisme().getName());
        }

        return response;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeNullable(String value) {
        String normalized = normalize(value);
        return normalized.isBlank() ? null : normalized;
    }

    private String generateTemporaryPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
        StringBuilder sb = new StringBuilder();
        java.util.Random random = new java.util.Random();
        for (int i = 0; i < 12; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
