package com.sse.controller;

import com.sse.dto.*;
import com.sse.entity.GlobalScore;
import com.sse.enums.TypeOrganisme;
import com.sse.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    
    private final DashboardService dashboardService;
    
    @GetMapping("/global")
    @PreAuthorize("hasAnyRole('ADMIN', 'GOUVERNEMENT')")
    public ResponseEntity<DashboardKPIs> getGlobalKPIs() {
        return ResponseEntity.ok(dashboardService.getGlobalKPIs());
    }
    
    @GetMapping("/ranking")
    @PreAuthorize("hasAnyRole('ADMIN', 'GOUVERNEMENT')")
    public ResponseEntity<List<RankingItem>> getRanking(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) TypeOrganisme type) {
        return ResponseEntity.ok(dashboardService.getRanking(year, type));
    }
    
    @GetMapping("/gap-analysis")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<GapAnalysisItem>> getGapAnalysis(
            @RequestParam UUID organismeId,
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(dashboardService.getGapAnalysis(organismeId, year));
    }
    
    @GetMapping("/evolution")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<GlobalScore>> getEvolution(@RequestParam UUID organismeId) {
        return ResponseEntity.ok(dashboardService.getEvolution(organismeId));
    }
}
