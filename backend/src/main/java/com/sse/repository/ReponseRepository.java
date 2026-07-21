package com.sse.repository;

import com.sse.entity.Reponse;
import com.sse.enums.StatusReponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReponseRepository extends JpaRepository<Reponse, UUID> {
    
    @Query("SELECT r FROM Reponse r JOIN FETCH r.critere c JOIN FETCH c.bonnePratique bp JOIN FETCH bp.principe p WHERE r.evaluation.id = :evaluationId AND p.id = :principeId")
    List<Reponse> findByEvaluationAndPrincipe(@Param("evaluationId") UUID evaluationId, 
                                               @Param("principeId") UUID principeId);
    
    @Query("SELECT r FROM Reponse r " +
           "JOIN FETCH r.critere c " +
           "JOIN FETCH c.bonnePratique bp " +
           "JOIN FETCH bp.principe p " +
           "WHERE r.evaluation.id = :evaluationId " +
           "ORDER BY p.order, bp.number, c.number")
    List<Reponse> findByEvaluationId(@Param("evaluationId") UUID evaluationId);
    
    @Query("""
        SELECT COUNT(r) FROM Reponse r
        WHERE r.evaluation.id = :evaluationId
          AND r.niveau IS NOT NULL
          AND (
            r.status NOT IN (
              com.sse.enums.StatusReponse.A_CORRIGER,
              com.sse.enums.StatusReponse.REJETEE
            )
            OR r.correctionAddressed = true
          )
        """)
    long countAnsweredByEvaluation(@Param("evaluationId") UUID evaluationId);
    
    @Query("SELECT COUNT(r) FROM Reponse r WHERE r.evaluation.id = :evaluationId")
    long countTotalByEvaluation(@Param("evaluationId") UUID evaluationId);
    
    @Query("SELECT r FROM Reponse r WHERE r.evaluation.id = :evaluationId AND r.status = :status")
    List<Reponse> findByEvaluationAndStatus(@Param("evaluationId") UUID evaluationId, 
                                             @Param("status") StatusReponse status);

    @Query("SELECT r.evaluation.organisme.id FROM Reponse r WHERE r.id = :id")
    Optional<UUID> findOrganismeIdByReponseId(@Param("id") UUID id);

    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM Reponse r WHERE r.evaluation.id = :evaluationId AND r.critere.id = :critereId")
    boolean existsByEvaluationIdAndCritereId(@Param("evaluationId") UUID evaluationId,
                                              @Param("critereId") UUID critereId);
}
