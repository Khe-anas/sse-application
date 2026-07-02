package com.sse.repository;

import com.sse.entity.Reclamation;
import com.sse.enums.ReclamationStatus;
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
public interface ReclamationRepository extends JpaRepository<Reclamation, UUID> {

    @Query("""
        SELECT r FROM Reclamation r
        WHERE (:status IS NULL OR r.status = :status)
        """)
    Page<Reclamation> findAllWithStatus(@Param("status") ReclamationStatus status,
                                         Pageable pageable);

    @Query("""
        SELECT r FROM Reclamation r
        JOIN r.organisme o
        JOIN r.submittedBy u
        WHERE (:status IS NULL OR r.status = :status)
          AND (
              LOWER(r.subject) LIKE LOWER(CONCAT('%', :search, '%')) OR
              LOWER(o.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
              LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR
              LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR
              LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
          )
        """)
    Page<Reclamation> findAllWithSearch(@Param("status") ReclamationStatus status,
                                         @Param("search") String search,
                                         Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Reclamation r WHERE r.id = :id")
    Optional<Reclamation> findByIdForUpdate(@Param("id") UUID id);
}
