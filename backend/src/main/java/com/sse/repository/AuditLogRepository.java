package com.sse.repository;

import com.sse.entity.AuditLog;
import com.sse.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<AuditLog> findByEvaluationIdOrderByCreatedAtDesc(UUID evaluationId, Pageable pageable);

    Page<AuditLog> findByAction(String action, Pageable pageable);

    Page<AuditLog> findByActionAndEntity(String action, String entity, Pageable pageable);

    Page<AuditLog> findByActionAndEntityAndUserId(String action, String entity, UUID userId, Pageable pageable);

    @Query("SELECT a FROM AuditLog a JOIN a.user u WHERE u.role = :role ORDER BY a.createdAt DESC")
    Page<AuditLog> findByUserRole(@Param("role") Role role, Pageable pageable);
}
