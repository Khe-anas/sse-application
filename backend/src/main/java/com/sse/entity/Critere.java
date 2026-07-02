package com.sse.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "criteres")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Critere {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false)
    private Integer number;
    
    @Column(nullable = false, length = 2000)
    private String labelFr;
    
    @Column(length = 2000)
    private String labelAr;
    
    @Column(length = 2000)
    private String labelEn;
    
    @Column(length = 3000)
    private String preuvesFr;
    
    @Column(length = 3000)
    private String preuvesAr;
    
    @Column(length = 3000)
    private String preuvesEn;
    
    @Column(length = 3000)
    private String referencesFr;
    
    @Column(length = 3000)
    private String referencesAr;
    
    @Column(length = 3000)
    private String referencesEn;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bonne_pratique_id", nullable = false)
    private BonnePratique bonnePratique;
    
    @OneToMany(mappedBy = "critere", cascade = CascadeType.ALL)
    private List<Reponse> reponses = new ArrayList<>();
}
