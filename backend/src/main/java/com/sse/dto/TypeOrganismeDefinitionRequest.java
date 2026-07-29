package com.sse.dto;

import com.sse.enums.TypeOrganisme;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TypeOrganismeDefinitionRequest(
    String code,
    @NotBlank String label,
    String description,
    @NotNull TypeOrganisme baseType,
    Boolean active
) {
}
