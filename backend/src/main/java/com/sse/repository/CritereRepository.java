package com.sse.repository;

import com.sse.entity.Critere;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CritereRepository extends JpaRepository<Critere, UUID> {
    
    List<Critere> findByBonnePratiqueIdOrderByNumberAsc(UUID bonnePratiqueId);
    
    @Query("SELECT c FROM Critere c JOIN c.bonnePratique bp JOIN bp.principe p WHERE p.id = :principeId")
    List<Critere> findByPrincipeId(@Param("principeId") UUID principeId);
    
    @Query("SELECT COUNT(c) FROM Critere c JOIN c.bonnePratique bp WHERE bp.principe.id = :principeId")
    long countByPrincipeId(@Param("principeId") UUID principeId);
}
