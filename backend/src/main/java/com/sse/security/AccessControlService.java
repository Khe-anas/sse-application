package com.sse.security;

import com.sse.repository.EvaluationRepository;
import com.sse.repository.ReponseRepository;
import com.sse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

@Component("accessControl")
@RequiredArgsConstructor
public class AccessControlService {

    private final EvaluationRepository evaluationRepository;
    private final ReponseRepository reponseRepository;
    private final UserRepository userRepository;
    private final RoleHierarchy roleHierarchy;

    public boolean canListOrganismes() {
        return hasRole("ADMIN") || hasRole("GOUVERNEMENT") || hasRole("EVALUATEUR");
    }

    public boolean canReadOrganisme(UUID organismeId) {
        return hasRole("ADMIN") || hasRole("GOUVERNEMENT") || hasRole("EVALUATEUR") || ownsOrganisme(organismeId);
    }

    public boolean canUpdateOrganismeContact(UUID organismeId) {
        return hasRole("ADMIN");
    }

    public boolean canListEvaluations(UUID organismeId) {
        if (hasRole("ADMIN") || hasRole("GOUVERNEMENT") || hasRole("EVALUATEUR")) {
            return true;
        }

        return hasRole("USER") && ownsOrganisme(organismeId);
    }

    public boolean canCreateEvaluation(UUID organismeId) {
        return hasRole("ADMIN") || (hasRole("USER") && ownsOrganisme(organismeId));
    }

    public boolean canReadEvaluation(UUID evaluationId) {
        if (hasRole("ADMIN") || hasRole("GOUVERNEMENT") || hasRole("EVALUATEUR")) {
            return true;
        }

        return hasRole("USER")
            && evaluationRepository.findOrganismeIdByEvaluationId(evaluationId)
                .map(this::ownsOrganisme)
                .orElse(false);
    }

    public boolean canWriteEvaluation(UUID evaluationId) {
        if (hasRole("ADMIN") || hasRole("EVALUATEUR")) {
            return true;
        }

        return hasRole("USER")
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
        if (hasRole("ADMIN") || hasRole("EVALUATEUR")) {
            return true;
        }

        return hasRole("USER")
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
        Collection<? extends GrantedAuthority> reachable =
            roleHierarchy.getReachableGrantedAuthorities(authentication.getAuthorities());
        return reachable.stream()
            .anyMatch(grantedAuthority -> authority.equals(grantedAuthority.getAuthority()));
    }
}
