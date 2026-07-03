package com.sse.service;

import com.sse.dto.AuditLogResponse;
import com.sse.entity.AuditLog;
import com.sse.entity.Evaluation;
import com.sse.entity.User;
import com.sse.repository.AuditLogRepository;
import com.sse.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final CurrentUserService currentUserService;

    @Transactional
    public void log(String action, String entity, String newValue) {
        log(action, entity, null, newValue, null);
    }

    @Transactional
    public void log(String action, String entity, String oldValue, String newValue) {
        log(action, entity, oldValue, newValue, null);
    }

    @Transactional
    public void log(String action, String entity, String oldValue, String newValue, Evaluation evaluation) {
        try {
            User actor = currentUserService.getCurrentUser();
            AuditLog auditLog = new AuditLog();
            auditLog.setUser(actor);
            auditLog.setAction(action);
            auditLog.setEntity(entity);
            auditLog.setOldValue(oldValue);
            auditLog.setNewValue(newValue);
            auditLog.setEvaluation(evaluation);
            auditLogRepository.save(auditLog);
            log.info("Audit: {} {} by {}: {}", action, entity, actor.getEmail(), newValue != null ? newValue : "");
        } catch (Exception e) {
            log.error("Failed to create audit log entry", e);
        }
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAll(String action, String entity, UUID userId, LocalDateTime from, LocalDateTime to, Pageable pageable) {
        Page<AuditLog> logs;

        if (action != null && entity != null && userId != null) {
            logs = auditLogRepository.findByActionAndEntityAndUserId(action, entity, userId, pageable);
        } else if (action != null && entity != null) {
            logs = auditLogRepository.findByActionAndEntity(action, entity, pageable);
        } else if (action != null) {
            logs = auditLogRepository.findByAction(action, pageable);
        } else if (userId != null) {
            logs = auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        } else {
            logs = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        return logs.map(this::toResponse);
    }

    private AuditLogResponse toResponse(AuditLog auditLog) {
        AuditLogResponse response = new AuditLogResponse();
        response.setId(auditLog.getId());
        if (auditLog.getUser() != null) {
            response.setUserId(auditLog.getUser().getId());
            response.setUserEmail(auditLog.getUser().getEmail());
            response.setUserFullName(auditLog.getUser().getFullName());
        }
        if (auditLog.getEvaluation() != null) {
            response.setEvaluationId(auditLog.getEvaluation().getId());
        }
        response.setAction(auditLog.getAction());
        response.setEntity(auditLog.getEntity());
        response.setOldValue(auditLog.getOldValue());
        response.setNewValue(auditLog.getNewValue());
        response.setIpAddress(auditLog.getIpAddress());
        response.setCreatedAt(auditLog.getCreatedAt());
        return response;
    }
}
