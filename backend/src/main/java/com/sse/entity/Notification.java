package com.sse.entity;

import com.sse.enums.TypeNotification;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeNotification type;
    
    @Column(nullable = false)
    private String titleFr;
    
    private String titleAr;
    
    private String titleEn;
    
    @Column(nullable = false, length = 2000)
    private String messageFr;
    
    @Column(length = 2000)
    private String messageAr;
    
    @Column(length = 2000)
    private String messageEn;
    
    @Column(nullable = false)
    private Boolean isRead = false;
    
    private String link;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
}
