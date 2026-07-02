package com.sse.dto;

import com.sse.enums.TypeOrganisme;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class OrganismeResponse {
    
    private UUID id;
    private String name;
    private TypeOrganisme type;
    private String sector;
    private String address;
    private String email;
    private String phone;
    private String website;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private Long usersCount;
    private Long evaluationsCount;
}
