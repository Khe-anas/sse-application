package com.sse.dto;

import com.sse.enums.TypeOrganisme;

import java.util.UUID;

public record TypeOrganismeDefinitionResponse(
    UUID id,
    String code,
    String label,
    String description,
    TypeOrganisme baseType,
    boolean systemType,
    boolean active
) {
}
