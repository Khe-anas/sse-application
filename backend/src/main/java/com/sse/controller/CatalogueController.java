package com.sse.controller;

import com.sse.dto.SecteurResponse;
import com.sse.dto.TypeOrganismeDefinitionResponse;
import com.sse.service.AdminCatalogueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/catalogues")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class CatalogueController {

    private final AdminCatalogueService catalogueService;

    @GetMapping("/types-organisme")
    public ResponseEntity<List<TypeOrganismeDefinitionResponse>> getTypes() {
        return ResponseEntity.ok(catalogueService.getTypes(true));
    }

    @GetMapping("/secteurs")
    public ResponseEntity<List<SecteurResponse>> getSectors() {
        return ResponseEntity.ok(catalogueService.getSectors(true));
    }
}
