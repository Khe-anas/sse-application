package com.sse.controller;

import com.sse.dto.AuditLogResponse;
import com.sse.dto.PageResponse;
import com.sse.service.AuditLogService;
import com.sse.util.PageableUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/admin/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@CrossOrigin(origins = "*")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<PageResponse<AuditLogResponse>> getAll(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entity,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) LocalDateTime from,
            @RequestParam(required = false) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        Pageable pageable = PageableUtils.create(
            page, size, sort, "createdAt", Sort.Direction.DESC,
            Set.of("createdAt", "action", "entity")
        );

        var result = auditLogService.getAll(action, entity, userId, from, to, pageable);
        return ResponseEntity.ok(new PageResponse<>(
            result.getContent(), result.getNumber(), result.getSize(),
            result.getTotalElements(), result.getTotalPages(), result.isLast(), result.isFirst()
        ));
    }
}
