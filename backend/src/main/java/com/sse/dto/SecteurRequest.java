package com.sse.dto;

import jakarta.validation.constraints.NotBlank;

public record SecteurRequest(
    String code,
    @NotBlank String label,
    String description,
    Boolean active
) {
}
