package com.sse.repository;

import com.sse.entity.EmailJob;
import com.sse.enums.EmailJobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface EmailJobRepository extends JpaRepository<EmailJob, UUID> {

    @Query("""
        SELECT j FROM EmailJob j
        LEFT JOIN FETCH j.user
        LEFT JOIN FETCH j.activationToken
        WHERE j.status = com.sse.enums.EmailJobStatus.PENDING
          AND j.attempts < j.maxAttempts
          AND j.nextAttemptAt <= :now
        ORDER BY j.createdAt ASC
        """)
    List<EmailJob> findDueJobs(@Param("now") LocalDateTime now, Pageable pageable);

    @Query("""
        SELECT j FROM EmailJob j
        WHERE (:status IS NULL OR j.status = :status)
        """)
    Page<EmailJob> findAllWithStatus(@Param("status") EmailJobStatus status, Pageable pageable);
}
