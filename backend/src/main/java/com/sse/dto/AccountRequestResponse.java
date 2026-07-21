package com.sse.dto;

import com.sse.enums.AccountRequestStatus;
import com.sse.enums.TypeOrganisme;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AccountRequestResponse {
    private UUID id;
    private String companyName;
    private TypeOrganisme type;
    private String responsibleFirstName;
    private String responsibleLastName;
    private String responsibleFullName;
    private String companyEmail;
    private String phone;
    private String fax;
    private String address;
    private String sector;
    private String companyRole;
    private String position;
    private String logoUrl;
    private AccountRequestStatus status;
    private String adminComment;
    private LocalDateTime processedAt;
    private UUID reviewedById;
    private String reviewedByName;
    private LocalDateTime reviewStartedAt;
    private UUID createdUserId;
    private UUID createdOrganismeId;
    private String createdOrganismeName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
