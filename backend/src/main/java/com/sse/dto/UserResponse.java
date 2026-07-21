package com.sse.dto;

import com.sse.enums.Role;
import com.sse.enums.TypeOrganisme;
import com.sse.enums.UserStatus;
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
    private String position;
    private Boolean isActive;
    private UserStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
    private UUID organismeId;
    private String organismeName;
    private TypeOrganisme organismeType;
    private String organismeSector;
    private String organismeAddress;
    private String organismeEmail;
    private String organismePhone;
    private String organismeFax;
    private String organismeWebsite;
    private String organismeLogoUrl;
}
