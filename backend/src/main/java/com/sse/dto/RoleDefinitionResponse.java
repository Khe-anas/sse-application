package com.sse.dto;

import com.sse.enums.Role;

import java.util.Set;
import java.util.UUID;

public record RoleDefinitionResponse(
    UUID id,
    String code,
    String label,
    String description,
    Role baseRole,
    boolean systemRole,
    boolean active,
    Set<String> permissionCodes,
    long usersCount
) {
}
