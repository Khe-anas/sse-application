package com.sse.service;

import com.sse.dto.AdminNotificationRequest;
import com.sse.dto.NotificationResponse;
import com.sse.entity.Evaluation;
import com.sse.entity.Notification;
import com.sse.entity.User;
import com.sse.enums.MaturityLevel;
import com.sse.enums.Role;
import com.sse.enums.TypeNotification;
import com.sse.repository.EvaluationRepository;
import com.sse.repository.NotificationRepository;
import com.sse.repository.ReponseRepository;
import com.sse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
    
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EvaluationRepository evaluationRepository;
    private final ReponseRepository reponseRepository;
    private final NotificationStreamService notificationStreamService;
    private final AuditLogService auditLogService;
    
    @Transactional
    public void sendEvaluationAssigned(UUID userId, String organismeName, Integer year) {
        sendEvaluationAssigned(userId, organismeName, year, null);
    }

    @Transactional
    public void sendEvaluationAssigned(UUID userId, String organismeName, Integer year, UUID evaluationId) {
        createNotification(userId, TypeNotification.EVALUATION_ASSIGNED,
            "Nouvelle évaluation assignée",
            "تقييم جديد مخصص",
            "New evaluation assigned",
            "Une nouvelle évaluation a été assignée à " + organismeName + " pour l'année " + year,
            "تم تخصيص تقييم جديد لـ " + organismeName + " للسنة " + year,
            "A new evaluation has been assigned to " + organismeName + " for year " + year,
            evaluationId != null ? "/user/evaluation/" + evaluationId : "/user/dashboard");
    }
    
    @Transactional
    public void sendEvaluationSubmitted(UUID userId, String organismeName, Integer year) {
        sendEvaluationSubmitted(userId, organismeName, year, null);
    }

    @Transactional
    public void sendEvaluationSubmitted(UUID userId, String organismeName, Integer year, UUID evaluationId) {
        User recipient = userRepository.findById(userId).orElse(null);
        if (recipient == null) return;

        String basePath = recipient.getRole() == Role.EVALUATEUR ? "/evaluateur/evaluations" : "/admin/evaluations";
        String link = evaluationId != null ? basePath + "/" + evaluationId + "/validate" : basePath;

        createNotification(recipient, TypeNotification.EVALUATION_SUBMITTED,
            "Évaluation soumise",
            "تم تقديم التقييم",
            "Evaluation submitted",
            organismeName + " a soumis son évaluation pour l'année " + year,
            "قدم " + organismeName + " تقييمه للسنة " + year,
            organismeName + " has submitted its evaluation for year " + year,
            link);
    }
    
    @Transactional
    public void sendEvaluationValidated(UUID userId, String organismeName, Float score, MaturityLevel level) {
        sendEvaluationValidated(userId, organismeName, score, level, null);
    }

    @Transactional
    public void sendEvaluationValidated(UUID userId, String organismeName, Float score, MaturityLevel level, UUID evaluationId) {
        createNotification(userId, TypeNotification.EVALUATION_VALIDATED,
            "Évaluation validée",
            "تم التحقق من التقييم",
            "Evaluation validated",
            "Votre évaluation pour " + organismeName + " a été validée. Score : " + String.format("%.1f", score) + "% - Niveau : " + level,
            "تم التحقق من تقييمك لـ " + organismeName + ". النتيجة : " + String.format("%.1f", score) + "% - المستوى : " + level,
            "Your evaluation for " + organismeName + " has been validated. Score: " + String.format("%.1f", score) + "% - Level: " + level,
            evaluationId != null ? "/evaluations/" + evaluationId + "/view" : "/user/dashboard");
    }
    
    @Transactional
    public void sendEvaluationRejected(UUID userId, String organismeName, String reason) {
        createNotification(userId, TypeNotification.EVALUATION_REJECTED,
            "Évaluation rejetée",
            "تم رفض التقييم",
            "Evaluation rejected",
            "Votre évaluation pour " + organismeName + " a été rejetée. Motif : " + reason,
            "تم رفض تقييمك لـ " + organismeName + ". السبب : " + reason,
            "Your evaluation for " + organismeName + " has been rejected. Reason: " + reason,
            "/user/dashboard");
    }
    
    @Transactional
    public void sendCorrectionRequested(UUID userId, String organismeName, String reason) {
        sendCorrectionRequested(userId, organismeName, reason, null, null);
    }

    @Transactional
    public void sendCorrectionRequested(UUID userId, String organismeName, String reason, UUID evaluationId) {
        sendCorrectionRequested(userId, organismeName, reason, evaluationId, null);
    }

    @Transactional
    public void sendCorrectionRequested(UUID userId, String organismeName, String reason, UUID evaluationId, String critereLabel) {
        String targetFr = critereLabel != null && !critereLabel.isBlank() ? " pour le critère \"" + critereLabel + "\"" : "";
        String targetAr = critereLabel != null && !critereLabel.isBlank() ? " للمعيار \"" + critereLabel + "\"" : "";
        String targetEn = critereLabel != null && !critereLabel.isBlank() ? " for criterion \"" + critereLabel + "\"" : "";
        String link = evaluationId != null ? "/user/evaluation/" + evaluationId : "/user/dashboard";

        createNotification(userId, TypeNotification.CORRECTION_REQUESTED,
            "Correction demandée",
            "تم طلب التصحيح",
            "Correction requested",
            "Une correction est demandée" + targetFr + " pour l'évaluation de " + organismeName + ". Motif : " + reason,
            "تم طلب تصحيح" + targetAr + " لتقييم " + organismeName + ". السبب : " + reason,
            "A correction is requested" + targetEn + " for the evaluation of " + organismeName + ". Reason: " + reason,
            link);
    }

    @Scheduled(cron = "0 0 9 * * *", zone = "Africa/Tunis")
    @Transactional
    public void sendScheduledIncompleteEvaluationReminders() {
        int sent = sendIncompleteEvaluationReminders();
        if (sent > 0) {
            log.info("Daily incomplete evaluation reminder job sent {} notifications", sent);
        }
    }

    @Transactional
    public int sendDailyIncompleteEvaluationReminders() {
        return sendIncompleteEvaluationReminders();
    }

    @Transactional
    public int sendAdminMessage(AdminNotificationRequest request) {
        if (request.getRecipientUserIds() == null || request.getRecipientUserIds().isEmpty()) {
            throw new RuntimeException("At least one recipient is required");
        }

        List<User> recipients = userRepository.findAllById(request.getRecipientUserIds());
        int sent = sendToUsers(recipients, TypeNotification.ADMIN_MESSAGE, request);
        auditLogService.log("SEND", "MESSAGE", "Admin sent message to " + request.getRecipientUserIds().size() + " recipient(s)");
        return sent;
    }

    @Transactional
    public int sendAnnouncement(AdminNotificationRequest request) {
        List<User> recipients = request.getRoles() == null || request.getRoles().isEmpty()
            ? userRepository.findByIsActiveTrue()
            : userRepository.findByRoleInAndIsActiveTrue(request.getRoles());

        int sent = sendToUsers(recipients, TypeNotification.ANNOUNCEMENT, request);
        String targetDesc = request.getRoles() != null ? request.getRoles().toString() : "ALL_ACTIVE";
        auditLogService.log("SEND", "ANNOUNCEMENT", "Admin sent announcement to " + targetDesc + " (" + sent + " users)");
        return sent;
    }

    @Transactional
    public int sendAccountRequestSubmitted(UUID requestId, String companyName) {
        List<User> admins = userRepository.findByRoleInAndIsActiveTrue(List.of(Role.ADMIN));
        int sent = 0;

        for (User admin : admins) {
            createNotification(admin, TypeNotification.SYSTEM,
                "Nouvelle demande de compte",
                "طلب حساب جديد",
                "New account request",
                companyName + " a envoyé une demande de création de compte.",
                "أرسلت " + companyName + " طلب إنشاء حساب.",
                companyName + " submitted an account creation request.",
                "/admin/account-requests");
            sent++;
        }

        return sent;
    }

    @Transactional
    public int sendReclamationSubmitted(UUID reclamationId, String organismeName, String subject) {
        List<User> admins = userRepository.findByRoleInAndIsActiveTrue(List.of(Role.ADMIN));
        int sent = 0;

        for (User admin : admins) {
            createNotification(admin, TypeNotification.RECLAMATION_SUBMITTED,
                "Nouvelle reclamation",
                "شكوى جديدة",
                "New complaint",
                organismeName + " a envoye une reclamation : " + subject,
                "أرسلت " + organismeName + " شكوى: " + subject,
                organismeName + " submitted a complaint: " + subject,
                "/admin/reclamations");
            sent++;
        }

        return sent;
    }

    private int sendIncompleteEvaluationReminders() {
        List<Evaluation> evaluations = evaluationRepository.findIncompleteInProgressEvaluations();
        LocalDate today = LocalDate.now();
        int sent = 0;

        for (Evaluation evaluation : evaluations) {
            UUID evaluationId = evaluation.getId();
            UUID organismeId = evaluation.getOrganisme().getId();
            String organismeName = evaluation.getOrganisme().getName();
            String link = "/user/evaluation/" + evaluationId;
            long total = reponseRepository.countTotalByEvaluation(evaluationId);
            long answered = reponseRepository.countAnsweredByEvaluation(evaluationId);

            List<User> responsables = userRepository.findActiveUsersByOrganisme(organismeId);
            for (User responsable : responsables) {
                boolean alreadySentToday = notificationRepository.existsByUserIdAndTypeAndLinkAndCreatedAtAfter(
                    responsable.getId(), TypeNotification.REMINDER, link, today.atStartOfDay());
                if (alreadySentToday) {
                    continue;
                }

                createNotification(responsable, TypeNotification.REMINDER,
                    "Rappel : évaluation à compléter",
                    "تذكير: تقييم يجب إكماله",
                    "Reminder: evaluation to complete",
                    "Votre évaluation de " + organismeName + " pour " + evaluation.getYear()
                        + " n'est pas terminée (" + answered + "/" + total + " critères remplis).",
                    "تقييم " + organismeName + " لسنة " + evaluation.getYear()
                        + " غير مكتمل (" + answered + "/" + total + " معايير مكتملة).",
                    "Your evaluation for " + organismeName + " in " + evaluation.getYear()
                        + " is not complete (" + answered + "/" + total + " criteria filled).",
                    link);
                sent++;
            }
        }

        return sent;
    }

    private int sendToUsers(Collection<User> recipients, TypeNotification type, AdminNotificationRequest request) {
        Set<UUID> sentTo = new HashSet<>();
        int sent = 0;

        for (User user : recipients) {
            if (user == null || !Boolean.TRUE.equals(user.getIsActive()) || !sentTo.add(user.getId())) {
                continue;
            }

            createNotification(user, type,
                request.getTitleFr(),
                request.getTitleAr(),
                request.getTitleEn(),
                request.getMessageFr(),
                request.getMessageAr(),
                request.getMessageEn(),
                request.getLink());
            sent++;
        }

        return sent;
    }
    
    private void createNotification(UUID userId, TypeNotification type,
                                    String titleFr, String titleAr, String titleEn,
                                    String messageFr, String messageAr, String messageEn,
                                    String link) {
        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) return;
            
            Notification notif = new Notification();
            notif.setUser(user);
            notif.setType(type);
            notif.setTitleFr(titleFr);
            notif.setTitleAr(titleAr);
            notif.setTitleEn(titleEn);
            notif.setMessageFr(messageFr);
            notif.setMessageAr(messageAr);
            notif.setMessageEn(messageEn);
            notif.setLink(link);
            notif.setIsRead(false);
            
            Notification saved = notificationRepository.save(notif);
            publishAfterCommit(saved);
            log.info("Notification sent to user {}: {}", userId, titleFr);
        } catch (Exception e) {
            log.error("Error sending notification", e);
        }
    }

    private void createNotification(User user, TypeNotification type,
                                    String titleFr, String titleAr, String titleEn,
                                    String messageFr, String messageAr, String messageEn,
                                    String link) {
        Notification notif = new Notification();
        notif.setUser(user);
        notif.setType(type);
        notif.setTitleFr(titleFr);
        notif.setTitleAr(titleAr);
        notif.setTitleEn(titleEn);
        notif.setMessageFr(messageFr);
        notif.setMessageAr(messageAr);
        notif.setMessageEn(messageEn);
        notif.setLink(link);
        notif.setIsRead(false);

        Notification saved = notificationRepository.save(notif);
        publishAfterCommit(saved);
        log.info("Notification sent to user {}: {}", user.getId(), titleFr);
    }
    
    public Page<NotificationResponse> getMyNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
            .map(this::mapToResponse);
    }
    
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countUnreadByUser(userId);
    }
    
    @Transactional
    public void markAsRead(UUID notificationId, UUID userId) {
        Notification notif = notificationRepository.findByIdAndUserId(notificationId, userId)
            .orElseThrow(() -> new RuntimeException("Notification not found"));
        notif.setIsRead(true);
        notificationRepository.save(notif);
    }
    
    @Transactional
    public void markAllAsRead(UUID userId) {
        notificationRepository.markAllAsReadByUser(userId);
    }
    
    @Transactional
    public void deleteNotification(UUID notificationId, UUID userId) {
        Notification notif = notificationRepository.findByIdAndUserId(notificationId, userId)
            .orElseThrow(() -> new RuntimeException("Notification not found"));
        notificationRepository.delete(notif);
    }

    private NotificationResponse mapToResponse(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.setId(notification.getId());
        response.setType(notification.getType());
        response.setTitleFr(notification.getTitleFr());
        response.setTitleAr(notification.getTitleAr());
        response.setTitleEn(notification.getTitleEn());
        response.setMessageFr(notification.getMessageFr());
        response.setMessageAr(notification.getMessageAr());
        response.setMessageEn(notification.getMessageEn());
        response.setIsRead(notification.getIsRead());
        response.setLink(notification.getLink());
        response.setCreatedAt(notification.getCreatedAt());
        return response;
    }

    private void publishAfterCommit(Notification notification) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            notificationStreamService.publish(notification);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                notificationStreamService.publish(notification);
            }
        });
    }
}
