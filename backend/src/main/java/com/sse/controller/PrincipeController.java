package com.sse.controller;

import com.sse.dto.PrincipeResponse;
import com.sse.dto.ReferenceTranslationRequest;
import com.sse.dto.ReferenceTranslationResponse;
import com.sse.entity.BonnePratique;
import com.sse.entity.Critere;
import com.sse.entity.Principe;
import com.sse.service.PrincipeService;
import com.sse.service.ReferenceTranslationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/principes")
@RequiredArgsConstructor
public class PrincipeController {
    
    private final PrincipeService principeService;
    private final ReferenceTranslationService referenceTranslationService;
    
    @GetMapping
    @PreAuthorize("@permissionAccess.has('REFERENTIEL_READ')")
    public ResponseEntity<List<PrincipeResponse>> getAllPrincipes() {
        return ResponseEntity.ok(principeService.getAllPrincipes());
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("@permissionAccess.has('REFERENTIEL_READ')")
    public ResponseEntity<PrincipeResponse> getPrincipeById(@PathVariable UUID id) {
        return ResponseEntity.ok(principeService.getPrincipeById(id));
    }
    
    @PostMapping
    @PreAuthorize("@permissionAccess.has('REFERENTIEL_WRITE')")
    public ResponseEntity<Principe> createPrincipe(@RequestBody Map<String, String> request) {
        String nameFr = request.get("nameFr");
        String nameAr = request.get("nameAr");
        String nameEn = request.get("nameEn");
        String descriptionFr = request.get("descriptionFr");
        String descriptionAr = request.get("descriptionAr");
        String descriptionEn = request.get("descriptionEn");
        Float weight = request.containsKey("weight") ? Float.parseFloat(request.get("weight")) : 1.0f;
        return ResponseEntity.ok(principeService.createPrincipe(nameFr, nameAr, nameEn,
            descriptionFr, descriptionAr, descriptionEn, weight));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionAccess.has('REFERENTIEL_WRITE')")
    public ResponseEntity<Principe> updatePrincipe(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String nameFr = request.get("nameFr");
        String nameAr = request.get("nameAr");
        String nameEn = request.get("nameEn");
        String descriptionFr = request.get("descriptionFr");
        String descriptionAr = request.get("descriptionAr");
        String descriptionEn = request.get("descriptionEn");
        Float weight = request.containsKey("weight") ? Float.parseFloat(request.get("weight")) : null;
        Boolean isActive = request.containsKey("isActive") ? Boolean.parseBoolean(request.get("isActive")) : null;
        return ResponseEntity.ok(principeService.updatePrincipe(id, nameFr, nameAr, nameEn,
            descriptionFr, descriptionAr, descriptionEn, weight, isActive));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionAccess.has('REFERENTIEL_WRITE')")
    public ResponseEntity<Void> deletePrincipe(@PathVariable UUID id) {
        principeService.deletePrincipe(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/bonnes-pratiques")
    @PreAuthorize("@permissionAccess.has('REFERENTIEL_WRITE')")
    public ResponseEntity<BonnePratique> createBonnePratique(@RequestBody Map<String, String> request) {
        UUID principeId = UUID.fromString(request.get("principeId"));
        String labelFr = request.get("labelFr");
        String labelAr = request.get("labelAr");
        String labelEn = request.get("labelEn");
        return ResponseEntity.ok(principeService.createBonnePratique(principeId, labelFr, labelAr, labelEn));
    }

    @PutMapping("/bonnes-pratiques/{id}")
    @PreAuthorize("@permissionAccess.has('REFERENTIEL_WRITE')")
    public ResponseEntity<BonnePratique> updateBonnePratique(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String labelFr = request.get("labelFr");
        String labelAr = request.get("labelAr");
        String labelEn = request.get("labelEn");
        return ResponseEntity.ok(principeService.updateBonnePratique(id, labelFr, labelAr, labelEn));
    }

    @DeleteMapping("/bonnes-pratiques/{id}")
    @PreAuthorize("@permissionAccess.has('REFERENTIEL_WRITE')")
    public ResponseEntity<Void> deleteBonnePratique(@PathVariable UUID id) {
        principeService.deleteBonnePratique(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/criteres")
    @PreAuthorize("@permissionAccess.has('REFERENTIEL_WRITE')")
    public ResponseEntity<Critere> createCritere(@RequestBody Map<String, String> request) {
        UUID bonnePratiqueId = UUID.fromString(request.get("bonnePratiqueId"));
        String labelFr = request.get("labelFr");
        String labelAr = request.get("labelAr");
        String labelEn = request.get("labelEn");
        String preuvesFr = request.get("preuvesFr");
        String preuvesAr = request.get("preuvesAr");
        String preuvesEn = request.get("preuvesEn");
        String referencesFr = request.get("referencesFr");
        String referencesAr = request.get("referencesAr");
        String referencesEn = request.get("referencesEn");
        return ResponseEntity.ok(principeService.createCritere(bonnePratiqueId, labelFr, labelAr, labelEn,
            preuvesFr, preuvesAr, preuvesEn, referencesFr, referencesAr, referencesEn));
    }

    @PutMapping("/criteres/{id}")
    @PreAuthorize("@permissionAccess.has('REFERENTIEL_WRITE')")
    public ResponseEntity<Critere> updateCritere(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String labelFr = request.get("labelFr");
        String labelAr = request.get("labelAr");
        String labelEn = request.get("labelEn");
        String preuvesFr = request.get("preuvesFr");
        String preuvesAr = request.get("preuvesAr");
        String preuvesEn = request.get("preuvesEn");
        String referencesFr = request.get("referencesFr");
        String referencesAr = request.get("referencesAr");
        String referencesEn = request.get("referencesEn");
        return ResponseEntity.ok(principeService.updateCritere(id, labelFr, labelAr, labelEn,
            preuvesFr, preuvesAr, preuvesEn, referencesFr, referencesAr, referencesEn));
    }

    @DeleteMapping("/criteres/{id}")
    @PreAuthorize("@permissionAccess.has('REFERENTIEL_WRITE')")
    public ResponseEntity<Void> deleteCritere(@PathVariable UUID id) {
        principeService.deleteCritere(id);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/count-criteres")
    @PreAuthorize("@permissionAccess.has('REFERENTIEL_READ')")
    public ResponseEntity<Long> countAllCriteres() {
        return ResponseEntity.ok(principeService.countAllCriteres());
    }

    @PostMapping("/translate")
    @PreAuthorize("@permissionAccess.has('REFERENTIEL_WRITE')")
    public ResponseEntity<ReferenceTranslationResponse> translateReferenceFields(
        @RequestBody ReferenceTranslationRequest request
    ) {
        return ResponseEntity.ok(referenceTranslationService.translateFields(request.fields()));
    }
}
