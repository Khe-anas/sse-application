package com.sse.entity;

import com.sse.enums.Niveau;
import com.sse.enums.StatusReponse;
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
@Table(name = "reponses")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Reponse {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private Evaluation evaluation;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "critere_id", nullable = false)
    private Critere critere;
    
    @Enumerated(EnumType.STRING)
    private Niveau niveau;
    
    @Column(length = 2000)
    private String commentaire;
    
    @ElementCollection
    @CollectionTable(name = "reponse_files", joinColumns = @JoinColumn(name = "reponse_id"))
    @Column(name = "file_url")
    private List<String> preuveFiles = new ArrayList<>();
    
    @ElementCollection
    @CollectionTable(name = "reponse_links", joinColumns = @JoinColumn(name = "reponse_id"))
    @Column(name = "link_url")
    private List<String> preuveLinks = new ArrayList<>();
    
    @CreationTimestamp
    private LocalDateTime submittedAt;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusReponse status = StatusReponse.BROUILLON;
    
    private UUID validatedById;
    
    private LocalDateTime validatedAt;
    
    @Column(length = 1000)
    private String validatorComment;
    
    @Column(length = 1000)
    private String rejectionReason;

    private Boolean correctionAddressed = false;
}
