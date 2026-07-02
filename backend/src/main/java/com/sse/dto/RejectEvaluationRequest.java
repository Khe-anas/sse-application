package com.sse.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectEvaluationRequest {
    
    @NotBlank(message = "Reason is required")
    private String reason;
}
