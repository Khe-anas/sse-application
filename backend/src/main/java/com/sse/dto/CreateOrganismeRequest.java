package com.sse.dto;

import com.sse.enums.TypeOrganisme;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateOrganismeRequest {
    
    @NotBlank(message = "Name is required")
    private String name;
    
    @NotNull(message = "Type is required")
    private TypeOrganisme type;
    
    private String sector;
    private String address;
    private String email;
    private String phone;
    private String website;
}
