package com.sse.dto;

import java.util.UUID;

public record SecteurResponse(
    UUID id,
    String code,
    String label,
    String description,
    boolean active
) {
}
