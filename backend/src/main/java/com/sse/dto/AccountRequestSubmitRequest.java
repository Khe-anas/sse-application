package com.sse.dto;

import com.sse.enums.TypeOrganisme;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class AccountRequestSubmitRequest {

    @NotBlank(message = "Company name is required")
    private String companyName;

    @NotNull(message = "Company type is required")
    private TypeOrganisme type;

    @NotBlank(message = "Responsible first name is required")
    private String responsibleFirstName;

    @NotBlank(message = "Responsible last name is required")
    private String responsibleLastName;

    @NotBlank(message = "Company email is required")
    @Email(message = "Company email should be valid")
    private String companyEmail;

    private String phone;
    private String fax;
    private String address;
    private String sector;
    private String otherSector;

    @NotBlank(message = "Company role is required")
    private String companyRole;

    @NotBlank(message = "Position is required")
    private String position;

    private MultipartFile logo;
}
