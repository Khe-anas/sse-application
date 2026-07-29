package com.sse.service;

import com.sse.entity.TypeOrganismeDefinition;
import com.sse.enums.TypeOrganisme;
import com.sse.repository.TypeOrganismeDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CatalogueLookupService {

    private final TypeOrganismeDefinitionRepository typeRepository;

    @Transactional(readOnly = true)
    public TypeOrganismeDefinition resolveType(UUID definitionId, TypeOrganisme fallbackType) {
        TypeOrganismeDefinition definition;
        if (definitionId != null) {
            definition = typeRepository.findById(definitionId)
                .orElseThrow(() -> new RuntimeException("Type d'organisme introuvable"));
        } else {
            definition = typeRepository.findBySystemTypeTrueAndBaseType(fallbackType)
                .orElseThrow(() -> new RuntimeException("Type d'organisme système introuvable"));
        }

        if (!Boolean.TRUE.equals(definition.getActive())) {
            throw new RuntimeException("Ce type d'organisme est désactivé");
        }
        return definition;
    }
}
