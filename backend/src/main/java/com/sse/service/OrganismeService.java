package com.sse.service;

import com.sse.dto.*;
import com.sse.entity.Organisme;
import com.sse.enums.TypeOrganisme;
import com.sse.repository.EvaluationRepository;
import com.sse.repository.OrganismeRepository;
import com.sse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrganismeService {
    
    private final OrganismeRepository organismeRepository;
    private final EvaluationRepository evaluationRepository;
    private final UserRepository userRepository;
    
    @Transactional
    public OrganismeResponse createOrganisme(CreateOrganismeRequest request) {
        Organisme org = new Organisme();
        org.setName(request.getName());
        org.setType(request.getType());
        org.setSector(request.getSector());
        org.setAddress(request.getAddress());
        org.setEmail(request.getEmail());
        org.setPhone(request.getPhone());
        org.setWebsite(request.getWebsite());
        return mapToResponse(organismeRepository.save(org));
    }
    
    public Page<OrganismeResponse> getAllOrganismes(TypeOrganisme type, String search, Pageable pageable) {
        String normalizedSearch = search != null && !search.isBlank() ? search.trim() : null;
        Page<Organisme> organismes = normalizedSearch == null
            ? organismeRepository.findAllWithFilters(type, pageable)
            : organismeRepository.findAllWithSearch(type, normalizedSearch, pageable);

        return organismes.map(this::mapToResponse);
    }
    
    public OrganismeResponse getOrganismeById(UUID id) {
        Organisme org = organismeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Organisme not found"));
        return mapToResponse(org);
    }
    
    @Transactional
    public OrganismeResponse updateOrganisme(UUID id, CreateOrganismeRequest request) {
        Organisme org = organismeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Organisme not found"));
        
        org.setName(request.getName());
        org.setType(request.getType());
        org.setSector(request.getSector());
        org.setAddress(request.getAddress());
        org.setEmail(request.getEmail());
        org.setPhone(request.getPhone());
        org.setWebsite(request.getWebsite());
        
        return mapToResponse(organismeRepository.save(org));
    }

    @Transactional
    public OrganismeResponse updateOrganismeContact(UUID id, UpdateOrganismeContactRequest request) {
        Organisme org = organismeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Organisme not found"));

        if (request.getAddress() != null) {
            org.setAddress(normalizeNullable(request.getAddress()));
        }
        if (request.getPhone() != null) {
            org.setPhone(normalizeNullable(request.getPhone()));
        }
        if (request.getEmail() != null) {
            org.setEmail(normalizeNullable(request.getEmail()));
        }
        if (request.getWebsite() != null) {
            org.setWebsite(normalizeNullable(request.getWebsite()));
        }

        return mapToResponse(organismeRepository.save(org));
    }
    
    @Transactional
    public void deleteOrganisme(UUID id) {
        Organisme org = organismeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Organisme not found"));
        org.setIsActive(false);
        organismeRepository.save(org);
    }
    
    public OrganismeResponse mapToResponse(Organisme org) {
        OrganismeResponse response = new OrganismeResponse();
        response.setId(org.getId());
        response.setName(org.getName());
        response.setType(org.getType());
        response.setSector(org.getSector());
        response.setAddress(org.getAddress());
        response.setEmail(org.getEmail());
        response.setPhone(org.getPhone());
        response.setWebsite(org.getWebsite());
        response.setIsActive(org.getIsActive());
        response.setCreatedAt(org.getCreatedAt());
        response.setUsersCount((long) org.getUsers().size());
        response.setEvaluationsCount((long) org.getEvaluations().size());
        return response;
    }

    private String normalizeNullable(String value) {
        String normalized = value == null ? "" : value.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
