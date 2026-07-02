package com.sse.entity;

import com.sse.enums.AccountRequestStatus;
import com.sse.enums.TypeOrganisme;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
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
@Table(name = "account_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccountRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String companyName;

    @Enumerated(EnumType.STRING)
    private TypeOrganisme type = TypeOrganisme.PRIVE;

    @Column(nullable = false)
    private String responsibleFirstName;

    @Column(nullable = false)
    private String responsibleLastName;

    @Column(nullable = false)
    private String companyEmail;

    private String phone;

    @Column(length = 1000)
    private String address;

    private String sector;

    @Column(length = 2000)
    private String message;

    @ElementCollection
    @CollectionTable(name = "account_request_files", joinColumns = @JoinColumn(name = "account_request_id"))
    @Column(name = "file_url")
    private List<String> verificationFiles = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountRequestStatus status = AccountRequestStatus.PENDING;

    @Column(length = 2000)
    private String adminComment;

    private LocalDateTime processedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;

    private LocalDateTime reviewStartedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_user_id")
    private User createdUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_organisme_id")
    private Organisme createdOrganisme;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public String getResponsibleFullName() {
        return responsibleFirstName + " " + responsibleLastName;
    }
}
