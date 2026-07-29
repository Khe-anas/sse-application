package com.sse.controller;

import com.sse.dto.PermissionResponse;
import com.sse.dto.RoleDefinitionRequest;
import com.sse.dto.RoleDefinitionResponse;
import com.sse.service.AdminAccessControlService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/access-control")
@RequiredArgsConstructor
@PreAuthorize("@permissionAccess.isSystemAdmin()")
public class AdminAccessControlController {

    private final AdminAccessControlService accessControlService;

    @GetMapping("/roles")
    public ResponseEntity<List<RoleDefinitionResponse>> getRoles() {
        return ResponseEntity.ok(accessControlService.getRoles());
    }

    @GetMapping("/permissions")
    public ResponseEntity<List<PermissionResponse>> getPermissions() {
        return ResponseEntity.ok(accessControlService.getPermissions());
    }

    @PostMapping("/roles")
    public ResponseEntity<RoleDefinitionResponse> createRole(
        @Valid @RequestBody RoleDefinitionRequest request
    ) {
        return ResponseEntity.ok(accessControlService.createRole(request));
    }

    @PutMapping("/roles/{id}")
    public ResponseEntity<RoleDefinitionResponse> updateRole(
        @PathVariable UUID id,
        @Valid @RequestBody RoleDefinitionRequest request
    ) {
        return ResponseEntity.ok(accessControlService.updateRole(id, request));
    }
}
