package com.sse.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.sse.dto.AuditLogResponse;
import com.sse.entity.AuditLog;
import com.sse.entity.Evaluation;
import com.sse.entity.User;
import com.sse.enums.Role;
import com.sse.repository.AuditLogRepository;
import com.sse.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
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
    public Page<AuditLogResponse> getAll(String action, String entity, UUID userId, Role role, LocalDateTime from, LocalDateTime to, Pageable pageable) {
        Page<AuditLog> logs;

        if (role != null) {
            logs = auditLogRepository.findByUserRole(role, pageable);
        } else if (action != null && entity != null && userId != null) {
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

    public byte[] exportPdf(String action, String entity, UUID userId, Role role, LocalDateTime from, LocalDateTime to) {
        Page<AuditLogResponse> page = getAll(action, entity, userId, role, from, to, PageRequest.of(0, 10000));
        List<AuditLogResponse> logs = page.getContent();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate());
        PdfWriter.getInstance(document, baos);
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
        Paragraph title = new Paragraph("Audit Logs Export", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(20);
        document.add(title);

        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 8);

        PdfPTable table = new PdfPTable(6);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2, 2.5f, 1.2f, 1.5f, 3, 2});

        for (String header : new String[]{"Date", "User", "Role", "Action", "Entity", "Details"}) {
            PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
            cell.setPadding(5);
            table.addCell(cell);
        }

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        for (AuditLogResponse log : logs) {
            table.addCell(new PdfPCell(new Phrase(log.getCreatedAt() != null ? log.getCreatedAt().format(dtf) : "", cellFont)));
            table.addCell(new PdfPCell(new Phrase(log.getUserEmail() != null ? log.getUserEmail() : "", cellFont)));
            table.addCell(new PdfPCell(new Phrase(log.getUserRole() != null ? log.getUserRole() : "", cellFont)));
            table.addCell(new PdfPCell(new Phrase(log.getAction() != null ? log.getAction() : "", cellFont)));
            table.addCell(new PdfPCell(new Phrase(log.getEntity() != null ? log.getEntity() : "", cellFont)));
            table.addCell(new PdfPCell(new Phrase(log.getNewValue() != null ? log.getNewValue() : "", cellFont)));
        }

        document.add(table);
        document.close();

        return baos.toByteArray();
    }

    private AuditLogResponse toResponse(AuditLog auditLog) {
        AuditLogResponse response = new AuditLogResponse();
        response.setId(auditLog.getId());
        if (auditLog.getUser() != null) {
            response.setUserId(auditLog.getUser().getId());
            response.setUserEmail(auditLog.getUser().getEmail());
            response.setUserFullName(auditLog.getUser().getFullName());
            response.setUserRole(auditLog.getUser().getRole().name());
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
