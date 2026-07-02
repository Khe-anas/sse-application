package com.sse.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateOrganismeContactRequest {

    @Size(max = 1000)
    private String address;

    @Size(max = 100)
    private String phone;

    @Email
    @Size(max = 255)
    private String email;

    @Size(max = 255)
    private String website;
}
