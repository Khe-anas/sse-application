package com.sse.repository;

import com.sse.entity.Organisme;
import com.sse.enums.TypeOrganisme;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganismeRepository extends JpaRepository<Organisme, UUID> {
    
    Page<Organisme> findByType(TypeOrganisme type, Pageable pageable);
    
    Page<Organisme> findByIsActiveTrue(Pageable pageable);

    @Query("SELECT o FROM Organisme o WHERE LOWER(o.name) = LOWER(:name) AND o.isActive = true")
    Optional<Organisme> findActiveByNameIgnoreCase(@Param("name") String name);
    
    @Query("SELECT o FROM Organisme o WHERE o.isActive = true AND " +
           "(:type IS NULL OR o.type = :type)")
    Page<Organisme> findAllWithFilters(@Param("type") TypeOrganisme type,
                                        Pageable pageable);

    @Query("SELECT o FROM Organisme o WHERE o.isActive = true AND " +
           "(:type IS NULL OR o.type = :type) AND " +
           "(LOWER(o.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(o.sector) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Organisme> findAllWithSearch(@Param("type") TypeOrganisme type,
                                        @Param("search") String search,
                                        Pageable pageable);
    
    @Query("SELECT COUNT(o) FROM Organisme o WHERE o.isActive = true")
    long countActive();
    
    @Query("SELECT COUNT(o) FROM Organisme o WHERE o.type = :type AND o.isActive = true")
    long countByType(@Param("type") TypeOrganisme type);
    
    @Query("SELECT o FROM Organisme o LEFT JOIN FETCH o.users WHERE o.id = :id")
    Optional<Organisme> findByIdWithUsers(@Param("id") UUID id);
}
