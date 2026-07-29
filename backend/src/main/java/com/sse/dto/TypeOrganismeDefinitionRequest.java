package com.sse.dto;

import jakarta.validation.constraints.NotBlank;

public record TypeOrganismeDefinitionRequest(
    String code,
    @NotBlank String label,
    String description,
    Boolean active
) {
}
