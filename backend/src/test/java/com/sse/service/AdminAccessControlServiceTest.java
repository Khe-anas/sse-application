package com.sse.service;

import com.sse.entity.RoleDefinition;
import com.sse.repository.PermissionDefinitionRepository;
import com.sse.repository.RoleDefinitionRepository;
import com.sse.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAccessControlServiceTest {

    @Mock
    private RoleDefinitionRepository roleRepository;

    @Mock
    private PermissionDefinitionRepository permissionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AdminAccessControlService service;

    @Test
    void deletesAnUnusedCustomRole() {
        UUID id = UUID.randomUUID();
        RoleDefinition role = new RoleDefinition();
        role.setId(id);
        role.setCode("SECURITE");
        role.setSystemRole(false);
        role.setPermissions(new LinkedHashSet<>());
        when(roleRepository.findWithPermissionsById(id)).thenReturn(Optional.of(role));
        when(userRepository.countByRoleDefinitionId(id)).thenReturn(0L);

        service.deleteRole(id);

        verify(roleRepository).delete(role);
        verify(auditLogService).log("DELETE", "ROLE", "Deleted functional role SECURITE");
    }

    @Test
    void protectsSystemRoles() {
        UUID id = UUID.randomUUID();
        RoleDefinition role = new RoleDefinition();
        role.setId(id);
        role.setSystemRole(true);
        when(roleRepository.findWithPermissionsById(id)).thenReturn(Optional.of(role));

        assertThatThrownBy(() -> service.deleteRole(id))
            .hasMessage("Un rôle système ne peut pas être supprimé");

        verify(roleRepository, never()).delete(role);
    }

    @Test
    void refusesToDeleteAnAssignedRole() {
        UUID id = UUID.randomUUID();
        RoleDefinition role = new RoleDefinition();
        role.setId(id);
        role.setSystemRole(false);
        when(roleRepository.findWithPermissionsById(id)).thenReturn(Optional.of(role));
        when(userRepository.countByRoleDefinitionId(id)).thenReturn(3L);

        assertThatThrownBy(() -> service.deleteRole(id))
            .hasMessage("Ce rôle est encore attribué à un ou plusieurs utilisateurs");

        verify(roleRepository, never()).delete(role);
    }
}
