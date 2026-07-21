package com.sse.dto;

import com.sse.enums.TypeOrganisme;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class CreateUserWithOrganismeRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    private String password;
    private String phone;
    private String position;

    @NotBlank(message = "Organization name is required")
    private String organisationName;

    @NotNull(message = "Organization type is required")
    private TypeOrganisme organisationType;

    private String sector;
    private String address;

    @Email(message = "Organization email should be valid")
    private String organisationEmail;

    private String organisationPhone;
    private String fax;
    private String website;

    @NotNull(message = "Organization logo is required")
    private MultipartFile logo;

    @AssertTrue(message = "Password must be empty or at least 8 characters")
    public boolean isPasswordValid() {
        return password == null || password.isBlank() || password.length() >= 8;
    }
}
