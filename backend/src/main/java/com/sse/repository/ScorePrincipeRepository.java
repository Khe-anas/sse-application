package com.sse.repository;

import com.sse.entity.ScorePrincipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ScorePrincipeRepository extends JpaRepository<ScorePrincipe, UUID> {
    
    List<ScorePrincipe> findByEvaluationId(UUID evaluationId);
    
    List<ScorePrincipe> findByEvaluationIdOrderByPrincipeNumberAsc(UUID evaluationId);
}
