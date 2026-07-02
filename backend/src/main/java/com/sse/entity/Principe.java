package com.sse.entity;

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
@Table(name = "principes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Principe {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(unique = true, nullable = false)
    private Integer number;
    
    @Column(nullable = false)
    private String nameFr;
    
    private String nameAr;
    
    private String nameEn;
    
    @Column(length = 2000)
    private String descriptionFr;
    
    @Column(length = 2000)
    private String descriptionAr;
    
    @Column(length = 2000)
    private String descriptionEn;
    
    @Column(nullable = false)
    private Float weight = 1.0f;
    
    @Column(nullable = false)
    private Boolean isFixed = false;
    
    @Column(nullable = false)
    private Boolean isActive = true;
    
    @Column(name = "display_order", nullable = false)
    private Integer order = 0;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @OneToMany(mappedBy = "principe", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("number ASC")
    private List<BonnePratique> bonnesPratiques = new ArrayList<>();
}
