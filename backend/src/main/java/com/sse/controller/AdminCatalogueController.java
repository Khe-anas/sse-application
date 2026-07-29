package com.sse.controller;

import com.sse.dto.SecteurRequest;
import com.sse.dto.SecteurResponse;
import com.sse.dto.TypeOrganismeDefinitionRequest;
import com.sse.dto.TypeOrganismeDefinitionResponse;
import com.sse.service.AdminCatalogueService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/catalogues")
@RequiredArgsConstructor
@PreAuthorize("@permissionAccess.isSystemAdmin()")
public class AdminCatalogueController {

    private final AdminCatalogueService catalogueService;

    @GetMapping("/types-organisme")
    public ResponseEntity<List<TypeOrganismeDefinitionResponse>> getTypes(
        @RequestParam(defaultValue = "false") boolean activeOnly
    ) {
        return ResponseEntity.ok(catalogueService.getTypes(activeOnly));
    }

    @PostMapping("/types-organisme")
    public ResponseEntity<TypeOrganismeDefinitionResponse> createType(
        @Valid @RequestBody TypeOrganismeDefinitionRequest request
    ) {
        return ResponseEntity.ok(catalogueService.createType(request));
    }

    @PutMapping("/types-organisme/{id}")
    public ResponseEntity<TypeOrganismeDefinitionResponse> updateType(
        @PathVariable UUID id,
        @Valid @RequestBody TypeOrganismeDefinitionRequest request
    ) {
        return ResponseEntity.ok(catalogueService.updateType(id, request));
    }

    @GetMapping("/secteurs")
    public ResponseEntity<List<SecteurResponse>> getSectors(
        @RequestParam(defaultValue = "false") boolean activeOnly
    ) {
        return ResponseEntity.ok(catalogueService.getSectors(activeOnly));
    }

    @PostMapping("/secteurs")
    public ResponseEntity<SecteurResponse> createSector(
        @Valid @RequestBody SecteurRequest request
    ) {
        return ResponseEntity.ok(catalogueService.createSector(request));
    }

    @PutMapping("/secteurs/{id}")
    public ResponseEntity<SecteurResponse> updateSector(
        @PathVariable UUID id,
        @Valid @RequestBody SecteurRequest request
    ) {
        return ResponseEntity.ok(catalogueService.updateSector(id, request));
    }
}
