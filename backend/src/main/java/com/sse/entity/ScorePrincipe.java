package com.sse.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "scores_principe")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScorePrincipe {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private Evaluation evaluation;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "principe_id", nullable = false)
    private Principe principe;
    
    @Column(nullable = false)
    private Float score;
    
    @Column(nullable = false)
    private Float maxPossible = 100f;
    
    @Column(nullable = false)
    private Float weight = 1.0f;
}
