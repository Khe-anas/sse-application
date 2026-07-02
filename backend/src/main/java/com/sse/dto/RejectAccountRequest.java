package com.sse.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectAccountRequest {
    @NotBlank(message = "A rejection reason is required")
    private String adminComment;
}
