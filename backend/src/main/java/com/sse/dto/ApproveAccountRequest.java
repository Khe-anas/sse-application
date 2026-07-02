package com.sse.dto;

import jakarta.validation.constraints.AssertTrue;
import lombok.Data;

@Data
public class ApproveAccountRequest {
    private String password;
    private String adminComment;

    @AssertTrue(message = "Password must be empty or at least 8 characters")
    public boolean isPasswordValid() {
        return password == null || password.isBlank() || password.length() >= 8;
    }
}
