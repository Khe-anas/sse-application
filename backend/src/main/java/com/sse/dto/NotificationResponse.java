package com.sse.dto;

import com.sse.enums.TypeNotification;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class NotificationResponse {

    private UUID id;
    private TypeNotification type;
    private String titleFr;
    private String titleAr;
    private String titleEn;
    private String messageFr;
    private String messageAr;
    private String messageEn;
    private Boolean isRead;
    private String link;
    private LocalDateTime createdAt;
}
