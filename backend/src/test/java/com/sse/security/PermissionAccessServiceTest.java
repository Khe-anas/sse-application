package com.sse.security;

import com.sse.entity.RoleDefinition;
import com.sse.entity.User;
import com.sse.enums.Role;
import com.sse.repository.PermissionDefinitionRepository;
import com.sse.repository.RoleDefinitionRepository;
import com.sse.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PermissionAccessServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleDefinitionRepository roleRepository;

    @Mock
    private PermissionDefinitionRepository permissionRepository;

    @InjectMocks
    private PermissionAccessService permissionAccessService;

    @Test
    void returnsPermissionsAssignedToCustomRole() {
        UUID roleId = UUID.randomUUID();
        RoleDefinition role = role("RH", Role.ADMIN, false);
        role.setId(roleId);
        User user = user(Role.ADMIN, role);
        Set<String> expected = Set.of("USERS_READ", "USERS_WRITE");
        when(permissionRepository.findActiveCodesByRoleDefinitionId(roleId)).thenReturn(expected);

        assertThat(permissionAccessService.permissionsFor(user)).isEqualTo(expected);
        assertThat(permissionAccessService.isSystemAdmin(user)).isFalse();
    }

    @Test
    void systemAdministratorAlwaysReceivesAllActivePermissions() {
        RoleDefinition role = role("ADMIN", Role.ADMIN, true);
        User user = user(Role.ADMIN, role);
        Set<String> expected = Set.of("USERS_READ", "ORGANISMES_WRITE", "AUDIT_READ");
        when(permissionRepository.findAllActiveCodes()).thenReturn(expected);

        assertThat(permissionAccessService.permissionsFor(user)).isEqualTo(expected);
        assertThat(permissionAccessService.isSystemAdmin(user)).isTrue();
    }

    @Test
    void legacyAdministratorRemainsSystemAdministratorDuringMigration() {
        User user = user(Role.ADMIN, null);

        assertThat(permissionAccessService.isSystemAdmin(user)).isTrue();
    }

    private RoleDefinition role(String code, Role baseRole, boolean systemRole) {
        RoleDefinition role = new RoleDefinition();
        role.setCode(code);
        role.setBaseRole(baseRole);
        role.setSystemRole(systemRole);
        role.setActive(true);
        return role;
    }

    private User user(Role role, RoleDefinition definition) {
        User user = new User();
        user.setRole(role);
        user.setRoleDefinition(definition);
        return user;
    }
}
