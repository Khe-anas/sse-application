package com.sse.repository;

import com.sse.entity.BonnePratique;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BonnePratiqueRepository extends JpaRepository<BonnePratique, UUID> {
    
    List<BonnePratique> findByPrincipeIdOrderByNumberAsc(UUID principeId);
}
