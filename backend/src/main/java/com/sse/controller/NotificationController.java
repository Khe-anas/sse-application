package com.sse.controller;

import com.sse.dto.AdminNotificationRequest;
import com.sse.security.CurrentUserService;
import com.sse.service.NotificationService;
import com.sse.service.NotificationStreamService;
import com.sse.util.PageableUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {
    
    private final NotificationService notificationService;
    private final NotificationStreamService notificationStreamService;
    private final CurrentUserService currentUserService;
    
    @GetMapping
    public ResponseEntity<?> getMyNotifications(
            HttpServletRequest request,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        UUID userId = currentUserService.getCurrentUserId(request);
        Pageable pageable = PageableUtils.create(
            page,
            size,
            "createdAt,desc",
            "createdAt",
            Sort.Direction.DESC,
            Set.of("createdAt")
        );
        return ResponseEntity.ok(notificationService.getMyNotifications(userId, pageable));
    }
    
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(HttpServletRequest request) {
        UUID userId = currentUserService.getCurrentUserId(request);
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamNotifications(HttpServletRequest request) {
        UUID userId = currentUserService.getCurrentUserId(request);
        return notificationStreamService.subscribe(userId);
    }
    
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID id, HttpServletRequest request) {
        UUID userId = currentUserService.getCurrentUserId(request);
        notificationService.markAsRead(id, userId);
        return ResponseEntity.ok().build();
    }
    
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(HttpServletRequest request) {
        UUID userId = currentUserService.getCurrentUserId(request);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable UUID id, HttpServletRequest request) {
        UUID userId = currentUserService.getCurrentUserId(request);
        notificationService.deleteNotification(id, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/admin/messages")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Integer>> sendAdminMessage(@Valid @RequestBody AdminNotificationRequest request) {
        int sent = notificationService.sendAdminMessage(request);
        return ResponseEntity.ok(Map.of("sent", sent));
    }

    @PostMapping("/admin/announcements")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Integer>> sendAnnouncement(@Valid @RequestBody AdminNotificationRequest request) {
        int sent = notificationService.sendAnnouncement(request);
        return ResponseEntity.ok(Map.of("sent", sent));
    }

    @PostMapping("/admin/reminders/run")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Integer>> runIncompleteEvaluationReminders() {
        int sent = notificationService.sendDailyIncompleteEvaluationReminders();
        return ResponseEntity.ok(Map.of("sent", sent));
    }
}
