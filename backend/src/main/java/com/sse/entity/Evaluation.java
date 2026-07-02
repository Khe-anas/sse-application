package com.sse.entity;

import com.sse.enums.MaturityLevel;
import com.sse.enums.StatusEvaluation;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "evaluations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Evaluation {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organisme_id", nullable = false)
    private Organisme organisme;
    
    @Column(nullable = false)
    private Integer year;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusEvaluation status = StatusEvaluation.EN_COURS;
    
    @CreationTimestamp
    private LocalDateTime startedAt;
    
    private LocalDateTime submittedAt;
    
    private LocalDateTime validatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "validation_opened_by_id")
    private User validationOpenedBy;

    private LocalDateTime validationOpenedAt;
    
    private Float globalScore;
    
    @Enumerated(EnumType.STRING)
    private MaturityLevel maturityLevel;
    
    @Column(length = 2000)
    private String comments;
    
    @OneToMany(mappedBy = "evaluation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Reponse> reponses = new ArrayList<>();
    
    @OneToMany(mappedBy = "evaluation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScorePrincipe> scores = new ArrayList<>();
    
    @OneToMany(mappedBy = "evaluation", cascade = CascadeType.ALL)
    private List<AuditLog> auditLogs = new ArrayList<>();
}
