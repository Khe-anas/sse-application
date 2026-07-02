package com.sse.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluation_id")
    private Evaluation evaluation;
    
    @Column(nullable = false)
    private String action;
    
    @Column(nullable = false)
    private String entity;
    
    @Lob
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    private String oldValue;
    
    @Lob
    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    private String newValue;
    
    private String ipAddress;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
}
