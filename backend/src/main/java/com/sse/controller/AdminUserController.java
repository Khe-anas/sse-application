package com.sse.controller;

import com.sse.dto.*;
import com.sse.enums.Role;
import com.sse.service.UserService;
import com.sse.util.PageableUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@CrossOrigin(origins = "*")
public class AdminUserController {
    
    private final UserService userService;
    
    @GetMapping
    public ResponseEntity<PageResponse<UserResponse>> getAllUsers(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) UUID organismeId,
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
            Set.of("email", "firstName", "lastName", "role", "createdAt", "lastLoginAt")
        );
        
        var result = userService.getAllUsers(role, organismeId, search, pageable);
        return ResponseEntity.ok(new PageResponse<>(
            result.getContent(), result.getNumber(), result.getSize(),
            result.getTotalElements(), result.getTotalPages(), result.isLast(), result.isFirst()
        ));
    }
    
    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.ok(userService.createUser(request));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        userService.deleteUser(id);
        return ResponseEntity.ok().build();
    }
    
    @PutMapping("/{id}/reset-password")
    public ResponseEntity<String> resetPassword(@PathVariable UUID id) {
        String newPassword = userService.resetPassword(id);
        return ResponseEntity.ok(newPassword);
    }
}
