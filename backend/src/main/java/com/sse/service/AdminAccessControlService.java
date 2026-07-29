package com.sse.service;

import com.sse.dto.PermissionResponse;
import com.sse.dto.RoleDefinitionRequest;
import com.sse.dto.RoleDefinitionResponse;
import com.sse.entity.PermissionDefinition;
import com.sse.entity.RoleDefinition;
import com.sse.repository.PermissionDefinitionRepository;
import com.sse.repository.RoleDefinitionRepository;
import com.sse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminAccessControlService {

    private final RoleDefinitionRepository roleRepository;
    private final PermissionDefinitionRepository permissionRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<RoleDefinitionResponse> getRoles() {
        return roleRepository.findAllByOrderBySystemRoleDescLabelAsc().stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> getPermissions() {
        return permissionRepository.findByActiveTrueOrderByResourceCodeAscActionAsc().stream()
            .map(permission -> new PermissionResponse(
                permission.getId(),
                permission.getCode(),
                permission.getResourceCode(),
                permission.getAction(),
                permission.getLabel(),
                permission.getDescription()
            ))
            .toList();
    }

    @Transactional
    public RoleDefinitionResponse createRole(RoleDefinitionRequest request) {
        String code = normalizeCode(request.code(), request.label());
        if (roleRepository.existsByCodeIgnoreCase(code)) {
            throw new RuntimeException("Un rôle avec ce code existe déjà");
        }

        RoleDefinition role = new RoleDefinition();
        role.setCode(code);
        role.setLabel(request.label().trim());
        role.setDescription(normalize(request.description()));
        role.setBaseRole(request.baseRole());
        role.setSystemRole(false);
        role.setActive(true);
        role.setPermissions(resolvePermissions(request.permissionCodes()));
        RoleDefinition saved = roleRepository.save(role);
        auditLogService.log("CREATE", "ROLE", "Created functional role " + code);
        return toResponse(saved);
    }

    @Transactional
    public RoleDefinitionResponse updateRole(UUID id, RoleDefinitionRequest request) {
        RoleDefinition role = roleRepository.findWithPermissionsById(id)
            .orElseThrow(() -> new RuntimeException("Rôle introuvable"));

        role.setLabel(request.label().trim());
        role.setDescription(normalize(request.description()));

        boolean systemAdmin = Boolean.TRUE.equals(role.getSystemRole()) && "ADMIN".equals(role.getCode());
        if (!Boolean.TRUE.equals(role.getSystemRole())) {
            role.setBaseRole(request.baseRole());
            if (request.active() != null && !request.active() && userRepository.countByRoleDefinitionId(id) > 0) {
                throw new RuntimeException("Ce rôle est encore attribué à un ou plusieurs utilisateurs");
            }
            if (request.active() != null) {
                role.setActive(request.active());
            }
        }

        if (systemAdmin) {
            role.setPermissions(new LinkedHashSet<>(
                permissionRepository.findByActiveTrueOrderByResourceCodeAscActionAsc()
            ));
        } else {
            role.setPermissions(resolvePermissions(request.permissionCodes()));
        }

        RoleDefinition saved = roleRepository.save(role);
        auditLogService.log("UPDATE", "ROLE", "Updated functional role " + saved.getCode());
        return toResponse(saved);
    }

    private Set<PermissionDefinition> resolvePermissions(Set<String> codes) {
        if (codes == null || codes.isEmpty()) {
            return new LinkedHashSet<>();
        }
        Set<PermissionDefinition> permissions = permissionRepository.findByCodeInAndActiveTrue(codes);
        if (permissions.size() != codes.size()) {
            throw new RuntimeException("Une ou plusieurs permissions sont invalides");
        }
        return permissions.stream()
            .sorted(Comparator.comparing(PermissionDefinition::getCode))
            .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    }

    private RoleDefinitionResponse toResponse(RoleDefinition role) {
        Set<String> codes = role.getPermissions().stream()
            .filter(permission -> Boolean.TRUE.equals(permission.getActive()))
            .map(PermissionDefinition::getCode)
            .collect(java.util.stream.Collectors.toCollection(TreeSet::new));
        return new RoleDefinitionResponse(
            role.getId(),
            role.getCode(),
            role.getLabel(),
            role.getDescription(),
            role.getBaseRole(),
            Boolean.TRUE.equals(role.getSystemRole()),
            Boolean.TRUE.equals(role.getActive()),
            codes,
            userRepository.countByRoleDefinitionId(role.getId())
        );
    }

    private String normalizeCode(String requestedCode, String label) {
        String source = requestedCode == null || requestedCode.isBlank() ? label : requestedCode;
        String ascii = Normalizer.normalize(source, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        String code = ascii.toUpperCase(Locale.ROOT)
            .replaceAll("[^A-Z0-9]+", "_")
            .replaceAll("^_+|_+$", "");
        if (code.isBlank()) {
            throw new RuntimeException("Le code du rôle ne peut pas être vide");
        }
        return code.length() > 32 ? code.substring(0, 32) : code;
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
