package com.sse.dto;

import com.sse.enums.Role;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class UserResponse {
    
    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private String fullName;
    private Role role;
    private String phone;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
    private UUID organismeId;
    private String organismeName;
}
