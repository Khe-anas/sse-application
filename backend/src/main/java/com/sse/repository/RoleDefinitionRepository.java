package com.sse.repository;

import com.sse.entity.RoleDefinition;
import com.sse.enums.Role;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoleDefinitionRepository extends JpaRepository<RoleDefinition, UUID> {

    @EntityGraph(attributePaths = "permissions")
    List<RoleDefinition> findAllByOrderBySystemRoleDescLabelAsc();

    @Query("""
        SELECT DISTINCT role
        FROM RoleDefinition role
        LEFT JOIN FETCH role.permissions
        WHERE role.id = :id
        """)
    Optional<RoleDefinition> findWithPermissionsById(@Param("id") UUID id);

    Optional<RoleDefinition> findByCodeIgnoreCase(String code);

    Optional<RoleDefinition> findBySystemRoleTrueAndBaseRole(Role baseRole);

    boolean existsByCodeIgnoreCase(String code);
}
