package com.sse.dto;

import com.sse.enums.Role;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateUserRequest {
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;
    
    @NotBlank(message = "First name is required")
    private String firstName;
    
    @NotBlank(message = "Last name is required")
    private String lastName;
    
    @NotNull(message = "Role is required")
    private Role role;
    
    private String password;
    
    private String phone;
    private UUID organismeId;
    private String entrepriseName;

    @AssertTrue(message = "Password must be empty or at least 8 characters")
    public boolean isPasswordValid() {
        return password == null || password.isBlank() || password.length() >= 8;
    }
}
