package com.sse.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "bonnes_pratiques")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BonnePratique {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false)
    private Integer number;
    
    @Column(nullable = false)
    private String labelFr;
    
    private String labelAr;
    
    private String labelEn;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "principe_id", nullable = false)
    private Principe principe;
    
    @OneToMany(mappedBy = "bonnePratique", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("number ASC")
    private List<Critere> criteres = new ArrayList<>();
}
