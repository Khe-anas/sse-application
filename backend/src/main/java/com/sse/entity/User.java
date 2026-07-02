package com.sse.entity;

import com.sse.enums.Role;
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
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(unique = true, nullable = false)
    private String email;
    
    @Column(nullable = false)
    private String password;
    
    @Column(nullable = false)
    private String firstName;
    
    @Column(nullable = false)
    private String lastName;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;
    
    private String phone;
    
    @Column(nullable = false)
    private Boolean isActive = true;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    private LocalDateTime lastLoginAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organisme_id")
    private Organisme organisme;
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Notification> notifications = new ArrayList<>();
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<AuditLog> auditLogs = new ArrayList<>();
    
    public String getFullName() {
        return firstName + " " + lastName;
    }
}
