package com.sse.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateEvaluationRequest {
    
    @NotNull(message = "Organisme ID is required")
    private UUID organismeId;
    
    @NotNull(message = "Year is required")
    private Integer year;
    
    private String comments;
}
