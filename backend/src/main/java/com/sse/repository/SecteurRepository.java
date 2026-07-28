package com.sse.repository;

import com.sse.entity.Secteur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SecteurRepository extends JpaRepository<Secteur, UUID> {

    Optional<Secteur> findByCodeIgnoreCase(String code);

    List<Secteur> findByActiveTrueOrderByLabelAsc();

    @Modifying
    @Query(value = """
        INSERT INTO secteurs (id, code, label, active, created_at, updated_at)
        VALUES (:id, :code, :label, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (code) DO NOTHING
        """, nativeQuery = true)
    void insertIfMissing(@Param("id") UUID id, @Param("code") String code, @Param("label") String label);
}
