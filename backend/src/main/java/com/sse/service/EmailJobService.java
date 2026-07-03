package com.sse.service;

import com.sse.config.SseMailProperties;
import com.sse.dto.EmailJobResponse;
import com.sse.entity.ActivationToken;
import com.sse.entity.EmailJob;
import com.sse.enums.EmailJobStatus;
import com.sse.enums.EmailJobType;
import com.sse.repository.EmailJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailJobService {

    private final EmailJobRepository emailJobRepository;
    private final JavaMailSender mailSender;
    private final SseMailProperties mailProperties;
    private final ActivationTokenService activationTokenService;
    private final ActivationEmailTemplateService activationEmailTemplateService;

    @Scheduled(
        initialDelayString = "${sse.mail.jobs.initial-delay-ms:10000}",
        fixedDelayString = "${sse.mail.jobs.fixed-delay-ms:60000}"
    )
    @Transactional
    public void processDueJobs() {
        List<EmailJob> jobs = emailJobRepository.findDueJobs(
            LocalDateTime.now(),
            PageRequest.of(0, mailProperties.getJobBatchSize())
        );
        jobs.forEach(this::attemptSend);
    }

    @Transactional(readOnly = true)
    public Page<EmailJobResponse> getAll(EmailJobStatus status, Pageable pageable) {
        return emailJobRepository.findAllWithStatus(status, pageable).map(this::mapToResponse);
    }

    @Transactional
    public EmailJobResponse resend(UUID id) {
        EmailJob job = emailJobRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Email job not found"));

        if (job.getStatus() == EmailJobStatus.SENT) {
            throw new RuntimeException("This email job has already been sent");
        }

        refreshExpiredActivationToken(job);
        job.setStatus(EmailJobStatus.PENDING);
        job.setAttempts(0);
        job.setLastError(null);
        job.setNextAttemptAt(LocalDateTime.now());
        job.setSentAt(null);
        return mapToResponse(emailJobRepository.save(job));
    }

    private void attemptSend(EmailJob job) {
        refreshExpiredActivationToken(job);
        job.setAttempts(job.getAttempts() + 1);

        try {
            if (!mailProperties.isEnabled()) {
                throw new IllegalStateException("Mail sending is disabled (SSE_MAIL_ENABLED=false)");
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailProperties.getFrom());
            message.setTo(job.getToEmail());
            message.setSubject(job.getSubject());
            message.setText(job.getBody());
            mailSender.send(message);

            job.setStatus(EmailJobStatus.SENT);
            job.setSentAt(LocalDateTime.now());
            job.setLastError(null);
            log.info("Email job {} sent to {}", job.getId(), job.getToEmail());
        } catch (Exception ex) {
            job.setLastError(truncate(ex.getMessage()));
            if (job.getAttempts() >= job.getMaxAttempts()) {
                job.setStatus(EmailJobStatus.FAILED);
                log.error("Email job {} failed permanently after {} attempts", job.getId(), job.getAttempts(), ex);
            } else {
                job.setStatus(EmailJobStatus.PENDING);
                job.setNextAttemptAt(LocalDateTime.now().plusMinutes(mailProperties.getJobRetryDelayMinutes()));
                log.warn("Email job {} failed on attempt {}/{}", job.getId(), job.getAttempts(), job.getMaxAttempts(), ex);
            }
        }

        emailJobRepository.save(job);
    }

    private void refreshExpiredActivationToken(EmailJob job) {
        if (job.getType() != EmailJobType.ACCOUNT_ACTIVATION || job.getUser() == null) {
            return;
        }

        ActivationToken token = job.getActivationToken();
        LocalDateTime now = LocalDateTime.now();
        boolean tokenIsUsable = token != null
            && token.getUsedAt() == null
            && token.getExpiresAt() != null
            && token.getExpiresAt().isAfter(now);

        if (tokenIsUsable) {
            return;
        }

        ActivationTokenService.GeneratedActivationToken generated = activationTokenService.createToken(job.getUser());
        job.setActivationToken(generated.token());
        job.setSubject(activationEmailTemplateService.activationSubject());
        job.setBody(activationEmailTemplateService.activationBody(job.getUser(), generated.rawToken()));
    }

    public EmailJobResponse mapToResponse(EmailJob job) {
        EmailJobResponse response = new EmailJobResponse();
        response.setId(job.getId());
        response.setType(job.getType());
        response.setStatus(job.getStatus());
        if (job.getUser() != null) {
            response.setUserId(job.getUser().getId());
            response.setUserName(job.getUser().getFullName());
        }
        response.setToEmail(job.getToEmail());
        response.setSubject(job.getSubject());
        response.setAttempts(job.getAttempts());
        response.setMaxAttempts(job.getMaxAttempts());
        response.setLastError(job.getLastError());
        response.setNextAttemptAt(job.getNextAttemptAt());
        response.setSentAt(job.getSentAt());
        response.setCreatedAt(job.getCreatedAt());
        response.setUpdatedAt(job.getUpdatedAt());
        return response;
    }

    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() <= 4000 ? value : value.substring(0, 4000);
    }
}
