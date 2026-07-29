package com.sse.repository;

import com.sse.entity.PermissionDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface PermissionDefinitionRepository extends JpaRepository<PermissionDefinition, UUID> {

    List<PermissionDefinition> findByActiveTrueOrderByResourceCodeAscActionAsc();

    Set<PermissionDefinition> findByCodeInAndActiveTrue(Collection<String> codes);

    @Query("""
        SELECT p.code
        FROM RoleDefinition roleDefinition
        JOIN roleDefinition.permissions p
        WHERE roleDefinition.id = :roleDefinitionId
          AND roleDefinition.active = true
          AND p.active = true
        ORDER BY p.code
        """)
    Set<String> findActiveCodesByRoleDefinitionId(@Param("roleDefinitionId") UUID roleDefinitionId);

    @Query("SELECT p.code FROM PermissionDefinition p WHERE p.active = true ORDER BY p.code")
    Set<String> findAllActiveCodes();
}
