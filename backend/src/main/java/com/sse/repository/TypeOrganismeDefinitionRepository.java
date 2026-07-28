package com.sse.repository;

import com.sse.entity.TypeOrganismeDefinition;
import com.sse.enums.TypeOrganisme;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TypeOrganismeDefinitionRepository extends JpaRepository<TypeOrganismeDefinition, UUID> {
    Optional<TypeOrganismeDefinition> findByCode(TypeOrganisme code);
}
