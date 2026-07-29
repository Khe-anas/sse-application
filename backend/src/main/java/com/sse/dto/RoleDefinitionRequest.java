package com.sse.dto;

import com.sse.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Set;

public record RoleDefinitionRequest(
    String code,
    @NotBlank String label,
    String description,
    @NotNull Role baseRole,
    Set<String> permissionCodes,
    Boolean active
) {
}
