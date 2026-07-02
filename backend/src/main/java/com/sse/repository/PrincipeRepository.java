package com.sse.repository;

import com.sse.entity.Principe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PrincipeRepository extends JpaRepository<Principe, UUID> {
    
    Optional<Principe> findByNumber(Integer number);
    
    List<Principe> findByIsActiveTrueOrderByOrderAsc();
    
    @Query("SELECT DISTINCT p FROM Principe p LEFT JOIN FETCH p.bonnesPratiques WHERE p.isActive = true ORDER BY p.order")
    List<Principe> findAllActiveWithBonnesPratiques();
    
    @Query("SELECT DISTINCT p FROM Principe p LEFT JOIN FETCH p.bonnesPratiques WHERE p.id = :id")
    Optional<Principe> findByIdWithBonnesPratiques(UUID id);
    
    boolean existsByNumber(Integer number);
    
    long countByIsFixedTrue();
}
