package com.sse.entity;

import com.sse.enums.TypeOrganisme;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "organismes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Organisme {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeOrganisme type;
    
    private String sector;
    
    private String address;
    
    private String email;
    
    private String phone;
    
    private String website;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    @Column(nullable = false)
    private Boolean isActive = true;
    
    @OneToMany(mappedBy = "organisme", cascade = CascadeType.ALL)
    private List<User> users = new ArrayList<>();
    
    @OneToMany(mappedBy = "organisme", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Evaluation> evaluations = new ArrayList<>();
    
    @OneToMany(mappedBy = "organisme", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<GlobalScore> globalScores = new ArrayList<>();
}
