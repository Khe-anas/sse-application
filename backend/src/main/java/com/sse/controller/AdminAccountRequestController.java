package com.sse.controller;

import com.sse.dto.AccountRequestResponse;
import com.sse.dto.ApproveAccountRequest;
import com.sse.dto.ApproveAccountRequestResponse;
import com.sse.dto.PageResponse;
import com.sse.dto.RejectAccountRequest;
import com.sse.enums.AccountRequestStatus;
import com.sse.service.AccountRequestService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/admin/account-requests")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@CrossOrigin(origins = "*")
public class AdminAccountRequestController {

    private final AccountRequestService accountRequestService;

    @GetMapping
    public ResponseEntity<PageResponse<AccountRequestResponse>> getAll(
            @RequestParam(required = false) AccountRequestStatus status,
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
            Set.of("companyName", "companyEmail", "createdAt", "updatedAt", "status")
        );

        var result = accountRequestService.getAll(status, search, pageable);
        return ResponseEntity.ok(new PageResponse<>(
            result.getContent(), result.getNumber(), result.getSize(),
            result.getTotalElements(), result.getTotalPages(), result.isLast(), result.isFirst()
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountRequestResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(accountRequestService.getById(id));
    }

    @PutMapping("/{id}/claim")
    public ResponseEntity<AccountRequestResponse> claim(@PathVariable UUID id) {
        return ResponseEntity.ok(accountRequestService.claimForReview(id));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApproveAccountRequestResponse> approve(
            @PathVariable UUID id,
            @Valid @RequestBody ApproveAccountRequest request) {
        return ResponseEntity.ok(accountRequestService.approve(id, request));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<AccountRequestResponse> reject(
            @PathVariable UUID id,
            @Valid @RequestBody RejectAccountRequest request) {
        return ResponseEntity.ok(accountRequestService.reject(id, request));
    }
}
