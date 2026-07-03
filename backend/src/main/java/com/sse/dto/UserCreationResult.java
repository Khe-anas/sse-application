package com.sse.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserCreationResult {
    private UserResponse user;
    private UUID emailJobId;
    private LocalDateTime activationExpiresAt;
}
