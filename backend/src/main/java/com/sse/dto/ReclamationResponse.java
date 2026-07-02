package com.sse.dto;

import com.sse.enums.ReclamationStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ReclamationResponse {
    private UUID id;
    private UUID organismeId;
    private String organismeName;
    private UUID submittedById;
    private String submittedByName;
    private String submittedByEmail;
    private String subject;
    private String message;
    private ReclamationStatus status;
    private UUID openedById;
    private String openedByName;
    private LocalDateTime openedAt;
    private UUID resolvedById;
    private String resolvedByName;
    private LocalDateTime resolvedAt;
    private String adminResponse;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
