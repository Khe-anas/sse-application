package com.sse.repository;

import com.sse.entity.AccountRequest;
import com.sse.enums.AccountRequestStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountRequestRepository extends JpaRepository<AccountRequest, UUID> {

    boolean existsByCompanyEmailIgnoreCaseAndStatus(String companyEmail, AccountRequestStatus status);

    Page<AccountRequest> findByStatus(AccountRequestStatus status, Pageable pageable);

    @Query("""
        SELECT ar FROM AccountRequest ar
        WHERE (:status IS NULL OR ar.status = :status)
        AND (
            :search IS NULL OR
            LOWER(ar.companyName) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(ar.companyEmail) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(ar.responsibleFirstName) LIKE LOWER(CONCAT('%', :search, '%')) OR
            LOWER(ar.responsibleLastName) LIKE LOWER(CONCAT('%', :search, '%'))
        )
        """)
    Page<AccountRequest> findAllWithFilters(@Param("status") AccountRequestStatus status,
                                            @Param("search") String search,
                                            Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ar FROM AccountRequest ar WHERE ar.id = :id")
    Optional<AccountRequest> findByIdForUpdate(@Param("id") UUID id);

    long countByStatus(AccountRequestStatus status);
}
