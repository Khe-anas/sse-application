package com.sse.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApproveAccountRequestResponse {
    private AccountRequestResponse request;
    private UserResponse user;
    private String temporaryPassword;
}
