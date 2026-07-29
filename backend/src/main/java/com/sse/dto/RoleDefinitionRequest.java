package com.sse.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Set;

public record RoleDefinitionRequest(
    String code,
    @NotBlank String label,
    String description,
    Set<String> permissionCodes,
    Boolean active
) {
}
