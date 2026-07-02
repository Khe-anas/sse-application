package com.sse.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SubmitReclamationRequest {

    @NotBlank
    @Size(max = 255)
    private String subject;

    @NotBlank
    @Size(max = 4000)
    private String message;
}
