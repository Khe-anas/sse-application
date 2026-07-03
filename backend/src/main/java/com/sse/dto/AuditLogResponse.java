package com.sse.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AuditLogResponse {
    private UUID id;
    private UUID userId;
    private String userEmail;
    private String userFullName;
    private UUID evaluationId;
    private String action;
    private String entity;
    private String oldValue;
    private String newValue;
    private String ipAddress;
    private LocalDateTime createdAt;
}
