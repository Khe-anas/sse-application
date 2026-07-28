package com.sse.repository;

import com.sse.entity.RoleDefinition;
import com.sse.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RoleDefinitionRepository extends JpaRepository<RoleDefinition, UUID> {
    Optional<RoleDefinition> findByCode(Role code);
}
