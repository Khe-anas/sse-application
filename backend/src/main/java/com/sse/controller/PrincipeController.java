package com.sse.controller;

import com.sse.dto.PrincipeResponse;
import com.sse.entity.Principe;
import com.sse.service.PrincipeService;
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
@CrossOrigin(origins = "*")
public class PrincipeController {
    
    private final PrincipeService principeService;
    
    @GetMapping
    public ResponseEntity<List<PrincipeResponse>> getAllPrincipes() {
        return ResponseEntity.ok(principeService.getAllPrincipes());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<PrincipeResponse> getPrincipeById(@PathVariable UUID id) {
        return ResponseEntity.ok(principeService.getPrincipeById(id));
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Principe> createPrincipe(@RequestBody Map<String, String> request) {
        String nameFr = request.get("nameFr");
        String nameAr = request.get("nameAr");
        String nameEn = request.get("nameEn");
        Float weight = request.containsKey("weight") ? Float.parseFloat(request.get("weight")) : 1.0f;
        return ResponseEntity.ok(principeService.createPrincipe(nameFr, nameAr, nameEn, weight));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deletePrincipe(@PathVariable UUID id) {
        principeService.deletePrincipe(id);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/count-criteres")
    public ResponseEntity<Long> countAllCriteres() {
        return ResponseEntity.ok(principeService.countAllCriteres());
    }
}
