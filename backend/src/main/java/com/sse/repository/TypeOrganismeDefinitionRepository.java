package com.sse.repository;

import com.sse.entity.TypeOrganismeDefinition;
import com.sse.enums.TypeOrganisme;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TypeOrganismeDefinitionRepository extends JpaRepository<TypeOrganismeDefinition, UUID> {

    List<TypeOrganismeDefinition> findAllByOrderBySystemTypeDescLabelAsc();

    List<TypeOrganismeDefinition> findByActiveTrueOrderByLabelAsc();

    Optional<TypeOrganismeDefinition> findByCodeIgnoreCase(String code);

    Optional<TypeOrganismeDefinition> findBySystemTypeTrueAndBaseType(TypeOrganisme baseType);

    boolean existsByCodeIgnoreCase(String code);
}
