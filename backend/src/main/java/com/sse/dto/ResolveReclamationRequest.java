package com.sse.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResolveReclamationRequest {

    @Size(max = 2000)
    private String adminResponse;
}
