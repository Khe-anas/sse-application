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
    private final PermissionAccessService permissionAccess;

    public boolean canListOrganismes() {
        return permissionAccess.has("ORGANISMES_READ");
    }

    public boolean canReadOrganisme(UUID organismeId) {
        return permissionAccess.has("ORGANISMES_READ") || ownsOrganisme(organismeId);
    }

    public boolean canUpdateOrganismeContact(UUID organismeId) {
        return permissionAccess.has("ORGANISMES_WRITE")
            && (!hasRole("USER") || ownsOrganisme(organismeId));
    }

    public boolean canListEvaluations(UUID organismeId) {
        if (permissionAccess.has("EVALUATIONS_READ") && !hasRole("USER")) {
            return true;
        }

        return permissionAccess.has("EVALUATIONS_READ") && ownsOrganisme(organismeId);
    }

    public boolean canCreateEvaluation(UUID organismeId) {
        return permissionAccess.has("EVALUATIONS_WRITE")
            && (!hasRole("USER") || ownsOrganisme(organismeId));
    }

    public boolean canReadEvaluation(UUID evaluationId) {
        if (permissionAccess.has("EVALUATIONS_READ") && !hasRole("USER")) {
            return true;
        }

        return permissionAccess.has("EVALUATIONS_READ")
            && evaluationRepository.findOrganismeIdByEvaluationId(evaluationId)
                .map(this::ownsOrganisme)
                .orElse(false);
    }

    public boolean canWriteEvaluation(UUID evaluationId) {
        if (permissionAccess.has("EVALUATIONS_WRITE") && !hasRole("USER")) {
            return true;
        }

        return permissionAccess.has("EVALUATIONS_WRITE")
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
        if (permissionAccess.has("EVALUATIONS_WRITE") && !hasRole("USER")) {
            return true;
        }

        return permissionAccess.has("EVALUATIONS_WRITE")
            && reponseRepository.findOrganismeIdByReponseId(reponseId)
                .map(this::ownsOrganisme)
                .orElse(false);
    }

    public boolean canValidate() {
        return permissionAccess.has("EVALUATIONS_VALIDATE");
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
