package com.sse.controller;

import com.sse.dto.ReponseBatchRequest;
import com.sse.dto.ReponseResponse;
import com.sse.service.ReponseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/reponses")
@RequiredArgsConstructor
public class ReponseController {
    
    private final ReponseService reponseService;
    
    @GetMapping("/evaluation/{evaluationId}")
    @PreAuthorize("@accessControl.canReadReponses(#p0)")
    public ResponseEntity<List<ReponseResponse>> getReponsesByEvaluation(
            @PathVariable UUID evaluationId,
            @RequestParam(required = false) UUID principeId) {
        if (principeId != null) {
            return ResponseEntity.ok(reponseService.getReponsesByEvaluationAndPrincipe(evaluationId, principeId));
        }
        return ResponseEntity.ok(reponseService.getReponsesByEvaluation(evaluationId));
    }
    
    @PostMapping("/evaluation/{evaluationId}")
    @PreAuthorize("@accessControl.canWriteReponses(#p0)")
    public ResponseEntity<List<ReponseResponse>> saveReponses(
            @PathVariable UUID evaluationId,
            @RequestBody ReponseBatchRequest request) {
        return ResponseEntity.ok(reponseService.saveReponses(evaluationId, request));
    }
    
    @PutMapping("/{id}/validate")
    @PreAuthorize("@accessControl.canValidate()")
    public ResponseEntity<ReponseResponse> validateReponse(
            @PathVariable UUID id,
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(reponseService.validateReponse(id, request.get("comment")));
    }
    
    @PutMapping("/{id}/reject")
    @PreAuthorize("@accessControl.canValidate()")
    public ResponseEntity<ReponseResponse> rejectReponse(
            @PathVariable UUID id,
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(reponseService.rejectReponse(id, request.get("reason")));
    }
    
    @PutMapping("/{id}/request-correction")
    @PreAuthorize("@accessControl.canValidate()")
    public ResponseEntity<ReponseResponse> requestCorrectionReponse(
            @PathVariable UUID id,
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(reponseService.requestCorrectionReponse(id, request.get("reason")));
    }
    
    @PostMapping("/{id}/upload")
    @PreAuthorize("@accessControl.canUploadProof(#p0)")
    public ResponseEntity<String> uploadProof(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(reponseService.uploadProof(id, file));
    }
    
    @DeleteMapping("/{id}/files/{fileUrl:.+}")
    @PreAuthorize("@accessControl.canUploadProof(#p0)")
    public ResponseEntity<Void> deleteProof(
            @PathVariable UUID id,
            @PathVariable String fileUrl) {
        reponseService.deleteProof(id, "/uploads/" + fileUrl);
        return ResponseEntity.ok().build();
    }
}
