package com.sse.controller;

import com.sse.dto.PageResponse;
import com.sse.dto.ReclamationResponse;
import com.sse.dto.ResolveReclamationRequest;
import com.sse.dto.SubmitReclamationRequest;
import com.sse.enums.ReclamationStatus;
import com.sse.service.ReclamationService;
import com.sse.util.PageableUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReclamationController {

    private final ReclamationService reclamationService;

    @PostMapping("/reclamations")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReclamationResponse> submit(@Valid @RequestBody SubmitReclamationRequest request) {
        return ResponseEntity.ok(reclamationService.submit(request));
    }

    @GetMapping("/admin/reclamations")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PageResponse<ReclamationResponse>> getAll(
            @RequestParam(required = false) ReclamationStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        Pageable pageable = PageableUtils.create(
            page,
            size,
            sort,
            "createdAt",
            Sort.Direction.DESC,
            Set.of("createdAt", "updatedAt", "status", "subject")
        );

        var result = reclamationService.getAll(status, search, pageable);
        return ResponseEntity.ok(new PageResponse<>(
            result.getContent(), result.getNumber(), result.getSize(),
            result.getTotalElements(), result.getTotalPages(), result.isLast(), result.isFirst()
        ));
    }

    @GetMapping("/admin/reclamations/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ReclamationResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(reclamationService.getById(id));
    }

    @PutMapping("/admin/reclamations/{id}/claim")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ReclamationResponse> claim(@PathVariable UUID id) {
        return ResponseEntity.ok(reclamationService.claim(id));
    }

    @PutMapping("/admin/reclamations/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ReclamationResponse> resolve(
            @PathVariable UUID id,
            @Valid @RequestBody ResolveReclamationRequest request) {
        return ResponseEntity.ok(reclamationService.resolve(id, request));
    }
}
