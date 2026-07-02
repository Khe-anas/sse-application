package com.sse.entity;

import com.sse.enums.MaturityLevel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "global_scores")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GlobalScore {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organisme_id", nullable = false)
    private Organisme organisme;
    
    @Column(nullable = false)
    private Integer year;
    
    @Column(nullable = false)
    private Float score;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MaturityLevel maturityLevel;
    
    private Integer rank;
}
