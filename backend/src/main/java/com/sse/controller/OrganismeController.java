package com.sse.controller;

import com.sse.dto.*;
import com.sse.enums.TypeOrganisme;
import com.sse.service.EvaluationService;
import com.sse.service.OrganismeService;
import com.sse.util.PageableUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/organismes")
@RequiredArgsConstructor
public class OrganismeController {
    
    private final OrganismeService organismeService;
    private final EvaluationService evaluationService;
    
    @GetMapping
    @PreAuthorize("@accessControl.canListOrganismes()")
    public ResponseEntity<PageResponse<OrganismeResponse>> getAllOrganismes(
            @RequestParam(required = false) TypeOrganisme type,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "name,asc") String sort) {
        
        Pageable pageable = PageableUtils.create(
            page,
            size,
            sort,
            "name",
            Sort.Direction.ASC,
            Set.of("name", "type", "sector", "createdAt", "updatedAt")
        );
        
        var result = organismeService.getAllOrganismes(type, search, pageable);
        return ResponseEntity.ok(new PageResponse<>(
            result.getContent(), result.getNumber(), result.getSize(),
            result.getTotalElements(), result.getTotalPages(), result.isLast(), result.isFirst()
        ));
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrganismeResponse> createOrganisme(@Valid @RequestBody CreateOrganismeRequest request) {
        return ResponseEntity.ok(organismeService.createOrganisme(request));
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("@accessControl.canReadOrganisme(#p0)")
    public ResponseEntity<OrganismeResponse> getOrganismeById(@PathVariable UUID id) {
        return ResponseEntity.ok(organismeService.getOrganismeById(id));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrganismeResponse> updateOrganisme(@PathVariable UUID id, 
                                                              @Valid @RequestBody CreateOrganismeRequest request) {
        return ResponseEntity.ok(organismeService.updateOrganisme(id, request));
    }

    @PatchMapping("/{id}/contact")
    @PreAuthorize("@accessControl.canUpdateOrganismeContact(#p0)")
    public ResponseEntity<OrganismeResponse> updateOrganismeContact(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateOrganismeContactRequest request) {
        return ResponseEntity.ok(organismeService.updateOrganismeContact(id, request));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteOrganisme(@PathVariable UUID id) {
        organismeService.deleteOrganisme(id);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/{id}/evaluations")
    @PreAuthorize("@accessControl.canListEvaluations(#p0)")
    public ResponseEntity<List<EvaluationResponse>> getOrganismeEvaluations(@PathVariable UUID id) {
        return ResponseEntity.ok(evaluationService.getEvaluationsByOrganisme(id));
    }
}
