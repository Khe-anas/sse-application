package com.sse.security;

import com.sse.repository.EvaluationRepository;
import com.sse.repository.ReponseRepository;
import com.sse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component("accessControl")
@RequiredArgsConstructor
public class AccessControlService {

    private final EvaluationRepository evaluationRepository;
    private final ReponseRepository reponseRepository;
    private final UserRepository userRepository;

    public boolean canListOrganismes() {
        return hasRole("ADMIN") || hasRole("GOUVERNEMENT");
    }

    public boolean canReadOrganisme(UUID organismeId) {
        return hasRole("ADMIN") || hasRole("GOUVERNEMENT") || ownsOrganisme(organismeId);
    }

    public boolean canUpdateOrganismeContact(UUID organismeId) {
        return hasRole("ADMIN") || (hasRole("RESPONSABLE") && ownsOrganisme(organismeId));
    }

    public boolean canListEvaluations(UUID organismeId) {
        if (hasRole("ADMIN") || hasRole("GOUVERNEMENT")) {
            return true;
        }

        return hasRole("RESPONSABLE") && ownsOrganisme(organismeId);
    }

    public boolean canCreateEvaluation(UUID organismeId) {
        return hasRole("ADMIN") || (hasRole("RESPONSABLE") && ownsOrganisme(organismeId));
    }

    public boolean canReadEvaluation(UUID evaluationId) {
        if (hasRole("ADMIN") || hasRole("GOUVERNEMENT")) {
            return true;
        }

        return hasRole("RESPONSABLE")
            && evaluationRepository.findOrganismeIdByEvaluationId(evaluationId)
                .map(this::ownsOrganisme)
                .orElse(false);
    }

    public boolean canWriteEvaluation(UUID evaluationId) {
        if (hasRole("ADMIN")) {
            return true;
        }

        return hasRole("RESPONSABLE")
            && evaluationRepository.findOrganismeIdByEvaluationId(evaluationId)
                .map(this::ownsOrganisme)
                .orElse(false);
    }

    public boolean canReadReponses(UUID evaluationId) {
        return canReadEvaluation(evaluationId);
    }

    public boolean canWriteReponses(UUID evaluationId) {
        return canWriteEvaluation(evaluationId);
    }

    public boolean canUploadProof(UUID reponseId) {
        if (hasRole("ADMIN")) {
            return true;
        }

        return hasRole("RESPONSABLE")
            && reponseRepository.findOrganismeIdByReponseId(reponseId)
                .map(this::ownsOrganisme)
                .orElse(false);
    }

    public boolean isAdmin() {
        return hasRole("ADMIN");
    }

    private boolean ownsOrganisme(UUID organismeId) {
        if (organismeId == null) {
            return false;
        }

        return currentUserEmail()
            .flatMap(userRepository::findOrganismeIdByEmail)
            .map(organismeId::equals)
            .orElse(false);
    }

    private Optional<String> currentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        Object principal = authentication.getPrincipal();
        String email = null;
        if (principal instanceof UserDetails userDetails) {
            email = userDetails.getUsername();
        } else if (principal instanceof UserPrincipal userPrincipal) {
            email = userPrincipal.getEmail();
        } else if (principal instanceof String value && !"anonymousUser".equals(value)) {
            email = value;
        }

        return Optional.ofNullable(email);
    }

    private boolean hasRole(String role) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }

        String authority = "ROLE_" + role;
        return authentication.getAuthorities().stream()
            .anyMatch(grantedAuthority -> authority.equals(grantedAuthority.getAuthority()));
    }
}
