package com.sse.dto;

import com.sse.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class AdminNotificationRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String titleFr;

    private String titleAr;

    private String titleEn;

    @NotBlank(message = "Message is required")
    @Size(max = 2000, message = "Message must not exceed 2000 characters")
    private String messageFr;

    @Size(max = 2000, message = "Arabic message must not exceed 2000 characters")
    private String messageAr;

    @Size(max = 2000, message = "English message must not exceed 2000 characters")
    private String messageEn;

    private String link;

    private List<UUID> recipientUserIds = new ArrayList<>();

    private List<Role> roles = new ArrayList<>();
}
