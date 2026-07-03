package com.sse.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ActivateAccountRequest {

    @NotBlank(message = "Activation token is required")
    private String token;

    @NotBlank(message = "Password is required")
    private String password;

    @AssertTrue(message = "Password must be at least 8 characters")
    public boolean isPasswordValid() {
        return password != null && password.length() >= 8;
    }
}
