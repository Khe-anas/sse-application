package com.sse.dto;

import com.sse.enums.Role;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class UpdateUserRequest {
    
    private String firstName;
    private String lastName;
    private Role role;
    private UUID roleDefinitionId;
    private String phone;
    private String position;
    @Size(max = 150, message = "Grade must not exceed 150 characters")
    private String grade;
    private String password;
    private UUID organismeId;
    private Boolean isActive;

    @AssertTrue(message = "Password must be empty or at least 8 characters")
    public boolean isPasswordValid() {
        return password == null || password.isBlank() || password.length() >= 8;
    }
}
