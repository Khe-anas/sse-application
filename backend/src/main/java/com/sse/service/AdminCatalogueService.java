package com.sse.service;

import com.sse.dto.SecteurRequest;
import com.sse.dto.SecteurResponse;
import com.sse.dto.TypeOrganismeDefinitionRequest;
import com.sse.dto.TypeOrganismeDefinitionResponse;
import com.sse.entity.Secteur;
import com.sse.entity.TypeOrganismeDefinition;
import com.sse.repository.OrganismeRepository;
import com.sse.repository.SecteurRepository;
import com.sse.repository.TypeOrganismeDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminCatalogueService {

    private final TypeOrganismeDefinitionRepository typeRepository;
    private final SecteurRepository secteurRepository;
    private final OrganismeRepository organismeRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<TypeOrganismeDefinitionResponse> getTypes(boolean activeOnly) {
        List<TypeOrganismeDefinition> values = activeOnly
            ? typeRepository.findByActiveTrueOrderByLabelAsc()
            : typeRepository.findAllByOrderBySystemTypeDescLabelAsc();
        return values.stream().map(this::toTypeResponse).toList();
    }

    @Transactional
    public TypeOrganismeDefinitionResponse createType(TypeOrganismeDefinitionRequest request) {
        String code = uniqueCode(request.code(), request.label());
        TypeOrganismeDefinition definition = new TypeOrganismeDefinition();
        definition.setCode(code);
        definition.setLabel(request.label().trim());
        definition.setDescription(normalize(request.description()));
        definition.setBaseType(request.baseType());
        definition.setSystemType(false);
        definition.setActive(true);
        TypeOrganismeDefinition saved = typeRepository.save(definition);
        auditLogService.log("CREATE", "ORGANISME_TYPE", "Created organisation type " + code);
        return toTypeResponse(saved);
    }

    @Transactional
    public TypeOrganismeDefinitionResponse updateType(UUID id, TypeOrganismeDefinitionRequest request) {
        TypeOrganismeDefinition definition = typeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Type d'organisme introuvable"));
        definition.setLabel(request.label().trim());
        definition.setDescription(normalize(request.description()));
        if (!Boolean.TRUE.equals(definition.getSystemType())) {
            definition.setBaseType(request.baseType());
            if (request.active() != null) {
                if (!request.active() && organismeRepository.countByTypeDefinitionId(id) > 0) {
                    throw new RuntimeException("Ce type est encore utilisé par un organisme");
                }
                definition.setActive(request.active());
            }
        }
        TypeOrganismeDefinition saved = typeRepository.save(definition);
        auditLogService.log("UPDATE", "ORGANISME_TYPE", "Updated organisation type " + saved.getCode());
        return toTypeResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SecteurResponse> getSectors(boolean activeOnly) {
        List<Secteur> values = activeOnly
            ? secteurRepository.findByActiveTrueOrderByLabelAsc()
            : secteurRepository.findAllByOrderByLabelAsc();
        return values.stream().map(this::toSectorResponse).toList();
    }

    @Transactional
    public SecteurResponse createSector(SecteurRequest request) {
        String code = uniqueSectorCode(request.code(), request.label());
        Secteur secteur = new Secteur();
        secteur.setCode(code);
        secteur.setLabel(request.label().trim());
        secteur.setDescription(normalize(request.description()));
        secteur.setActive(true);
        Secteur saved = secteurRepository.save(secteur);
        auditLogService.log("CREATE", "SECTOR", "Created sector " + code);
        return toSectorResponse(saved);
    }

    @Transactional
    public SecteurResponse updateSector(UUID id, SecteurRequest request) {
        Secteur secteur = secteurRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Secteur introuvable"));
        secteur.setLabel(request.label().trim());
        secteur.setDescription(normalize(request.description()));
        if (request.active() != null) {
            secteur.setActive(request.active());
        }
        Secteur saved = secteurRepository.save(secteur);
        auditLogService.log("UPDATE", "SECTOR", "Updated sector " + saved.getCode());
        return toSectorResponse(saved);
    }

    private TypeOrganismeDefinitionResponse toTypeResponse(TypeOrganismeDefinition value) {
        return new TypeOrganismeDefinitionResponse(
            value.getId(),
            value.getCode(),
            value.getLabel(),
            value.getDescription(),
            value.getBaseType(),
            Boolean.TRUE.equals(value.getSystemType()),
            Boolean.TRUE.equals(value.getActive())
        );
    }

    private SecteurResponse toSectorResponse(Secteur value) {
        return new SecteurResponse(
            value.getId(),
            value.getCode(),
            value.getLabel(),
            value.getDescription(),
            Boolean.TRUE.equals(value.getActive())
        );
    }

    private String uniqueCode(String requestedCode, String label) {
        String code = normalizeCode(requestedCode, label);
        if (typeRepository.existsByCodeIgnoreCase(code)) {
            throw new RuntimeException("Un type avec ce code existe déjà");
        }
        return code;
    }

    private String uniqueSectorCode(String requestedCode, String label) {
        String code = normalizeCode(requestedCode, label);
        if (secteurRepository.existsByCodeIgnoreCase(code)) {
            throw new RuntimeException("Un secteur avec ce code existe déjà");
        }
        return code;
    }

    private String normalizeCode(String requestedCode, String label) {
        String source = requestedCode == null || requestedCode.isBlank() ? label : requestedCode;
        String ascii = Normalizer.normalize(source, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        String code = ascii.toUpperCase(Locale.ROOT)
            .replaceAll("[^A-Z0-9]+", "_")
            .replaceAll("^_+|_+$", "");
        if (code.isBlank()) {
            throw new RuntimeException("Le code ne peut pas être vide");
        }
        return code.length() > 32 ? code.substring(0, 32) : code;
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
