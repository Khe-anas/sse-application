package com.sse.dto;

import com.sse.enums.EmailJobStatus;
import com.sse.enums.EmailJobType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class EmailJobResponse {
    private UUID id;
    private EmailJobType type;
    private EmailJobStatus status;
    private UUID userId;
    private String userName;
    private String toEmail;
    private String subject;
    private Integer attempts;
    private Integer maxAttempts;
    private String lastError;
    private LocalDateTime nextAttemptAt;
    private LocalDateTime sentAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
