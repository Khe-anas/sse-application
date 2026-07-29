package com.sse.security;

import com.sse.entity.RoleDefinition;
import com.sse.entity.User;
import com.sse.enums.Role;
import com.sse.repository.PermissionDefinitionRepository;
import com.sse.repository.RoleDefinitionRepository;
import com.sse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

@Component("permissionAccess")
@RequiredArgsConstructor
public class PermissionAccessService {

    private final UserRepository userRepository;
    private final RoleDefinitionRepository roleRepository;
    private final PermissionDefinitionRepository permissionRepository;

    public boolean has(String permissionCode) {
        Optional<String> email = currentUserEmail();
        if (email.isEmpty()) {
            return false;
        }
        return userRepository.isSystemAdmin(email.get())
            || userRepository.hasActivePermission(email.get(), permissionCode);
    }

    public boolean isSystemAdmin() {
        return currentUserEmail()
            .map(userRepository::isSystemAdmin)
            .orElse(false);
    }

    @Transactional(readOnly = true)
    public Set<String> permissionsFor(User user) {
        RoleDefinition roleDefinition = user.getRoleDefinition();
        if (roleDefinition != null) {
            boolean systemAdmin = Boolean.TRUE.equals(roleDefinition.getSystemRole())
                && "ADMIN".equals(roleDefinition.getCode())
                && Boolean.TRUE.equals(roleDefinition.getActive());
            return systemAdmin
                ? permissionRepository.findAllActiveCodes()
                : permissionRepository.findActiveCodesByRoleDefinitionId(roleDefinition.getId());
        }

        if (user.getRole() == Role.ADMIN) {
            return permissionRepository.findAllActiveCodes();
        }

        return roleRepository.findBySystemRoleTrueAndBaseRole(user.getRole())
            .map(role -> permissionRepository.findActiveCodesByRoleDefinitionId(role.getId()))
            .orElseGet(Collections::emptySet);
    }

    public boolean isSystemAdmin(User user) {
        RoleDefinition roleDefinition = user.getRoleDefinition();
        return user.getRole() == Role.ADMIN
            && (
                roleDefinition == null
                || (
                    Boolean.TRUE.equals(roleDefinition.getSystemRole())
                    && "ADMIN".equals(roleDefinition.getCode())
                    && Boolean.TRUE.equals(roleDefinition.getActive())
                )
            );
    }

    private Optional<String> currentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails userDetails) {
            return Optional.ofNullable(userDetails.getUsername());
        }
        if (principal instanceof UserPrincipal userPrincipal) {
            return Optional.ofNullable(userPrincipal.getEmail());
        }
        if (principal instanceof String value && !"anonymousUser".equals(value)) {
            return Optional.of(value);
        }
        return Optional.empty();
    }
}
