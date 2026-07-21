package com.sse.controller;

import com.sse.dto.EmailJobResponse;
import com.sse.dto.PageResponse;
import com.sse.enums.EmailJobStatus;
import com.sse.service.EmailJobService;
import com.sse.util.PageableUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/admin/email-jobs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminEmailJobController {

    private final EmailJobService emailJobService;

    @GetMapping
    public ResponseEntity<PageResponse<EmailJobResponse>> getAll(
            @RequestParam(required = false) EmailJobStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        Pageable pageable = PageableUtils.create(
            page,
            size,
            sort,
            "createdAt",
            Sort.Direction.DESC,
            Set.of("createdAt", "updatedAt", "nextAttemptAt", "sentAt", "status", "attempts")
        );

        var result = emailJobService.getAll(status, pageable);
        return ResponseEntity.ok(new PageResponse<>(
            result.getContent(), result.getNumber(), result.getSize(),
            result.getTotalElements(), result.getTotalPages(), result.isLast(), result.isFirst()
        ));
    }

    @PostMapping("/{id}/resend")
    public ResponseEntity<EmailJobResponse> resend(@PathVariable UUID id) {
        return ResponseEntity.ok(emailJobService.resend(id));
    }
}
