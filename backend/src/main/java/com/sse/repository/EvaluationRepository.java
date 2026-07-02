package com.sse.repository;

import com.sse.entity.Evaluation;
import com.sse.enums.StatusEvaluation;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EvaluationRepository extends JpaRepository<Evaluation, UUID> {
    
    @Query("SELECT e FROM Evaluation e LEFT JOIN FETCH e.reponses r LEFT JOIN FETCH r.critere c LEFT JOIN FETCH c.bonnePratique bp LEFT JOIN FETCH bp.principe WHERE e.id = :id")
    Optional<Evaluation> findByIdWithDetails(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Evaluation e WHERE e.id = :id")
    Optional<Evaluation> findByIdForUpdate(@Param("id") UUID id);

    @Query("SELECT e.organisme.id FROM Evaluation e WHERE e.id = :id")
    Optional<UUID> findOrganismeIdByEvaluationId(@Param("id") UUID id);
    
    @Query("SELECT e FROM Evaluation e WHERE e.organisme.id = :organismeId AND e.year = :year AND e.status IN ('EN_COURS', 'SOUMISE', 'EN_VALIDATION')")
    List<Evaluation> findActiveByOrganismeAndYear(@Param("organismeId") UUID organismeId, @Param("year") Integer year);
    
    Page<Evaluation> findByOrganismeId(UUID organismeId, Pageable pageable);
    
    Page<Evaluation> findByStatus(StatusEvaluation status, Pageable pageable);
    
    @Query("SELECT e FROM Evaluation e WHERE " +
           "(:status IS NULL OR e.status = :status) AND " +
           "(:organismeId IS NULL OR e.organisme.id = :organismeId) AND " +
           "(:year IS NULL OR e.year = :year)")
    Page<Evaluation> findAllWithFilters(@Param("status") StatusEvaluation status,
                                         @Param("organismeId") UUID organismeId,
                                         @Param("year") Integer year,
                                         Pageable pageable);
    
    @Query("SELECT e FROM Evaluation e WHERE e.status = 'VALIDEE' AND e.year = :year ORDER BY e.globalScore DESC")
    List<Evaluation> findValidatedByYearOrderByScore(@Param("year") Integer year);
    
    @Query("SELECT COUNT(e) FROM Evaluation e WHERE e.status = :status")
    long countByStatus(@Param("status") StatusEvaluation status);
    
    @Query("SELECT AVG(e.globalScore) FROM Evaluation e WHERE e.status = 'VALIDEE' AND e.year = :year")
    Double findAverageScoreByYear(@Param("year") Integer year);
    
    List<Evaluation> findByOrganismeIdOrderByYearDesc(UUID organismeId);
    
    @Query("SELECT e FROM Evaluation e WHERE e.status IN ('SOUMISE', 'EN_VALIDATION')")
    List<Evaluation> findPendingValidations();

    @Query("""
        SELECT e FROM Evaluation e
        JOIN FETCH e.organisme o
        WHERE e.status = 'EN_COURS'
          AND (SELECT COUNT(rTotal) FROM Reponse rTotal WHERE rTotal.evaluation.id = e.id) > 0
          AND (SELECT COUNT(rAnswered) FROM Reponse rAnswered WHERE rAnswered.evaluation.id = e.id AND rAnswered.niveau IS NOT NULL)
              < (SELECT COUNT(rTotal2) FROM Reponse rTotal2 WHERE rTotal2.evaluation.id = e.id)
        """)
    List<Evaluation> findIncompleteInProgressEvaluations();
}
