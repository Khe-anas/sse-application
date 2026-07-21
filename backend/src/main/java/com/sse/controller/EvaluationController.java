package com.sse.controller;

import com.sse.dto.*;
import com.sse.enums.StatusEvaluation;
import com.sse.service.EvaluationService;
import com.sse.util.PageableUtils;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/evaluations")
@RequiredArgsConstructor
public class EvaluationController {
    
    private final EvaluationService evaluationService;
    
    @PostMapping
    @PreAuthorize("@accessControl.canCreateEvaluation(#p0.organismeId)")
    public ResponseEntity<EvaluationResponse> createEvaluation(@Valid @RequestBody CreateEvaluationRequest request) {
        return ResponseEntity.ok(evaluationService.createEvaluation(request));
    }
    
    @GetMapping
    @PreAuthorize("@accessControl.canListEvaluations(#p1)")
    public ResponseEntity<PageResponse<EvaluationResponse>> getEvaluations(
            @RequestParam(required = false) StatusEvaluation status,
            @RequestParam(required = false) UUID organismeId,
            @RequestParam(required = false) Integer year,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "startedAt,desc") String sort) {
        
        Pageable pageable = PageableUtils.create(
            page,
            size,
            sort,
            "startedAt",
            Sort.Direction.DESC,
            Set.of("startedAt", "submittedAt", "validatedAt", "year", "status", "globalScore")
        );
        
        var result = evaluationService.getEvaluations(status, organismeId, year, pageable);
        return ResponseEntity.ok(new PageResponse<>(
            result.getContent(), result.getNumber(), result.getSize(),
            result.getTotalElements(), result.getTotalPages(), result.isLast(), result.isFirst()
        ));
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("@accessControl.canReadEvaluation(#p0)")
    public ResponseEntity<EvaluationResponse> getEvaluationById(@PathVariable UUID id) {
        return ResponseEntity.ok(evaluationService.getEvaluationById(id));
    }
    
    @GetMapping("/organisme/{organismeId}")
    @PreAuthorize("@accessControl.canListEvaluations(#p0)")
    public ResponseEntity<List<EvaluationResponse>> getEvaluationsByOrganisme(@PathVariable UUID organismeId) {
        return ResponseEntity.ok(evaluationService.getEvaluationsByOrganisme(organismeId));
    }
    
    @PutMapping("/{id}/submit")
    @PreAuthorize("@accessControl.canWriteEvaluation(#p0)")
    public ResponseEntity<EvaluationResponse> submitEvaluation(@PathVariable UUID id) {
        return ResponseEntity.ok(evaluationService.submitEvaluation(id));
    }

    @PutMapping("/{id}/claim-validation")
    @PreAuthorize("@accessControl.canValidate()")
    public ResponseEntity<EvaluationResponse> claimValidation(@PathVariable UUID id) {
        return ResponseEntity.ok(evaluationService.claimValidation(id));
    }

    @PutMapping("/{id}/release-validation")
    @PreAuthorize("@accessControl.canValidate()")
    public ResponseEntity<Void> releaseValidation(@PathVariable UUID id) {
        evaluationService.releaseValidation(id);
        return ResponseEntity.ok().build();
    }
    
    @PutMapping("/{id}/validate")
    @PreAuthorize("@accessControl.canValidate()")
    public ResponseEntity<EvaluationResponse> validateEvaluation(
            @PathVariable UUID id,
            @RequestBody(required = false) ValidateEvaluationRequest request) {
        return ResponseEntity.ok(evaluationService.validateEvaluation(id, request != null ? request : new ValidateEvaluationRequest()));
    }
    
    @PutMapping("/{id}/reject")
    @PreAuthorize("@accessControl.canValidate()")
    public ResponseEntity<EvaluationResponse> rejectEvaluation(
            @PathVariable UUID id,
            @Valid @RequestBody RejectEvaluationRequest request) {
        return ResponseEntity.ok(evaluationService.rejectEvaluation(id, request.getReason()));
    }
    
    @PutMapping("/{id}/request-correction")
    @PreAuthorize("@accessControl.canValidate()")
    public ResponseEntity<EvaluationResponse> requestCorrection(
            @PathVariable UUID id,
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(evaluationService.requestCorrection(id, request.get("reason")));
    }
    
    // Alias for frontend compatibility
    @Data
    public static class MapWrapper {
        private String reason;
    }
}
