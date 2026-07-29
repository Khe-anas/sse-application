package com.sse.dto;

import com.sse.enums.PermissionAction;

import java.util.UUID;

public record PermissionResponse(
    UUID id,
    String code,
    String resourceCode,
    PermissionAction action,
    String label,
    String description
) {
}
