package com.sse.service;

import com.sse.dto.ReclamationResponse;
import com.sse.dto.ResolveReclamationRequest;
import com.sse.dto.SubmitReclamationRequest;
import com.sse.entity.Organisme;
import com.sse.entity.Reclamation;
import com.sse.entity.User;
import com.sse.enums.ReclamationStatus;
import com.sse.exception.ResourceLockedException;
import com.sse.repository.ReclamationRepository;
import com.sse.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReclamationService {

    private static final long REVIEW_LOCK_TIMEOUT_MINUTES = 10;

    private final ReclamationRepository reclamationRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    @Transactional
    public ReclamationResponse submit(SubmitReclamationRequest request) {
        User user = currentUserService.getCurrentUser();
        Organisme organisme = user.getOrganisme();
        if (organisme == null) {
            throw new RuntimeException("Votre compte n'est pas associe a un organisme");
        }

        Reclamation reclamation = new Reclamation();
        reclamation.setOrganisme(organisme);
        reclamation.setSubmittedBy(user);
        reclamation.setSubject(normalize(request.getSubject()));
        reclamation.setMessage(normalize(request.getMessage()));
        reclamation.setStatus(ReclamationStatus.PENDING);

        Reclamation saved = reclamationRepository.save(reclamation);
        notificationService.sendReclamationSubmitted(saved.getId(), organisme.getName(), saved.getSubject());
        auditLogService.log("SUBMIT", "RECLAMATION", "Reclamation submitted: " + saved.getSubject());
        return mapToResponse(saved, true);
    }

    @Transactional
    public Page<ReclamationResponse> getAll(ReclamationStatus status, String search, Pageable pageable) {
        String normalizedSearch = search != null && !search.isBlank() ? search.trim() : null;
        Page<Reclamation> result = normalizedSearch == null
            ? reclamationRepository.findAllWithStatus(status, pageable)
            : reclamationRepository.findAllWithSearch(status, normalizedSearch, pageable);

        result.forEach(this::releaseExpiredReviewLock);
        return result
            .map(reclamation -> mapToResponse(reclamation, false));
    }

    @Transactional
    public ReclamationResponse getById(UUID id) {
        User admin = currentUserService.getCurrentUser();
        Reclamation reclamation = findById(id);
        ensureCanOpen(reclamation, admin);
        return mapToResponse(reclamation, true);
    }

    @Transactional
    public ReclamationResponse claim(UUID id) {
        User admin = currentUserService.getCurrentUser();
        Reclamation reclamation = reclamationRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new RuntimeException("Reclamation not found"));

        claimForAdmin(reclamation, admin);
        return mapToResponse(reclamationRepository.save(reclamation), true);
    }

    @Transactional
    public void release(UUID id) {
        User admin = currentUserService.getCurrentUser();
        Reclamation reclamation = reclamationRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new RuntimeException("Reclamation not found"));

        User openedBy = reclamation.getOpenedBy();
        if (reclamation.getStatus() != ReclamationStatus.RESOLVED
            && openedBy != null
            && openedBy.getId().equals(admin.getId())) {
            clearReviewLock(reclamation);
            if (reclamation.getStatus() == ReclamationStatus.IN_REVIEW) {
                reclamation.setStatus(ReclamationStatus.PENDING);
            }
            reclamationRepository.save(reclamation);
        }
    }

    @Transactional
    public ReclamationResponse resolve(UUID id, ResolveReclamationRequest request) {
        User admin = currentUserService.getCurrentUser();
        Reclamation reclamation = reclamationRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new RuntimeException("Reclamation not found"));

        ensureCanOpen(reclamation, admin);
        reclamation.setStatus(ReclamationStatus.RESOLVED);
        reclamation.setResolvedBy(admin);
        reclamation.setResolvedAt(LocalDateTime.now());
        reclamation.setAdminResponse(normalizeNullable(request.getAdminResponse()));

        Reclamation saved = reclamationRepository.save(reclamation);
        auditLogService.log("RESOLVE", "RECLAMATION", "Reclamation " + id + " resolved");
        return mapToResponse(saved, true);
    }

    private Reclamation findById(UUID id) {
        return reclamationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Reclamation not found"));
    }

    private void claimForAdmin(Reclamation reclamation, User admin) {
        if (reclamation.getStatus() == ReclamationStatus.RESOLVED) {
            return;
        }

        releaseExpiredReviewLock(reclamation);

        User openedBy = reclamation.getOpenedBy();
        if (openedBy == null) {
            reclamation.setOpenedBy(admin);
            reclamation.setOpenedAt(LocalDateTime.now());
            if (reclamation.getStatus() == ReclamationStatus.PENDING) {
                reclamation.setStatus(ReclamationStatus.IN_REVIEW);
            }
            return;
        }

        if (!openedBy.getId().equals(admin.getId())) {
            throw new ResourceLockedException("Cette reclamation est deja ouverte par " + openedBy.getFullName());
        }

        reclamation.setOpenedAt(LocalDateTime.now());
    }

    private void ensureCanOpen(Reclamation reclamation, User admin) {
        if (reclamation.getStatus() == ReclamationStatus.RESOLVED) {
            return;
        }

        releaseExpiredReviewLock(reclamation);
        User openedBy = reclamation.getOpenedBy();
        if (openedBy != null && !openedBy.getId().equals(admin.getId())) {
            throw new ResourceLockedException("Cette reclamation est deja ouverte par " + openedBy.getFullName());
        }
    }

    private void releaseExpiredReviewLock(Reclamation reclamation) {
        if (reclamation.getOpenedBy() == null || reclamation.getOpenedAt() == null) {
            return;
        }

        LocalDateTime expiresAt = reclamation.getOpenedAt().plusMinutes(REVIEW_LOCK_TIMEOUT_MINUTES);
        if (expiresAt.isAfter(LocalDateTime.now())) {
            return;
        }

        clearReviewLock(reclamation);
        if (reclamation.getStatus() == ReclamationStatus.IN_REVIEW) {
            reclamation.setStatus(ReclamationStatus.PENDING);
        }
    }

    private void clearReviewLock(Reclamation reclamation) {
        reclamation.setOpenedBy(null);
        reclamation.setOpenedAt(null);
    }

    private ReclamationResponse mapToResponse(Reclamation reclamation, boolean includeMessage) {
        ReclamationResponse response = new ReclamationResponse();
        response.setId(reclamation.getId());
        response.setOrganismeId(reclamation.getOrganisme().getId());
        response.setOrganismeName(reclamation.getOrganisme().getName());
        response.setSubmittedById(reclamation.getSubmittedBy().getId());
        response.setSubmittedByName(reclamation.getSubmittedBy().getFullName());
        response.setSubmittedByEmail(reclamation.getSubmittedBy().getEmail());
        response.setSubject(reclamation.getSubject());
        response.setMessage(includeMessage ? reclamation.getMessage() : null);
        response.setStatus(reclamation.getStatus());
        response.setOpenedAt(reclamation.getOpenedAt());
        response.setResolvedAt(reclamation.getResolvedAt());
        response.setAdminResponse(includeMessage ? reclamation.getAdminResponse() : null);
        response.setCreatedAt(reclamation.getCreatedAt());
        response.setUpdatedAt(reclamation.getUpdatedAt());

        if (reclamation.getOpenedBy() != null) {
            response.setOpenedById(reclamation.getOpenedBy().getId());
            response.setOpenedByName(reclamation.getOpenedBy().getFullName());
        }
        if (reclamation.getResolvedBy() != null) {
            response.setResolvedById(reclamation.getResolvedBy().getId());
            response.setResolvedByName(reclamation.getResolvedBy().getFullName());
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
}
