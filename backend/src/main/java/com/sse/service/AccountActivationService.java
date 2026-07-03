package com.sse.service;

import com.sse.config.SseMailProperties;
import com.sse.entity.ActivationToken;
import com.sse.entity.EmailJob;
import com.sse.entity.User;
import com.sse.enums.EmailJobStatus;
import com.sse.enums.EmailJobType;
import com.sse.enums.UserStatus;
import com.sse.repository.ActivationTokenRepository;
import com.sse.repository.EmailJobRepository;
import com.sse.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountActivationService {

    private final ActivationTokenService activationTokenService;
    private final ActivationTokenRepository activationTokenRepository;
    private final EmailJobRepository emailJobRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SseMailProperties mailProperties;
    private final ActivationEmailTemplateService activationEmailTemplateService;

    @Transactional(propagation = Propagation.MANDATORY)
    public QueuedActivation queueActivationEmail(User user) {
        ActivationTokenService.GeneratedActivationToken generated = activationTokenService.createToken(user);

        EmailJob job = new EmailJob();
        job.setType(EmailJobType.ACCOUNT_ACTIVATION);
        job.setStatus(EmailJobStatus.PENDING);
        job.setUser(user);
        job.setActivationToken(generated.token());
        job.setToEmail(user.getEmail());
        job.setSubject(activationEmailTemplateService.activationSubject());
        job.setBody(activationEmailTemplateService.activationBody(user, generated.rawToken()));
        job.setAttempts(0);
        job.setMaxAttempts(mailProperties.getJobMaxAttempts());
        job.setNextAttemptAt(LocalDateTime.now());

        EmailJob savedJob = emailJobRepository.save(job);
        return new QueuedActivation(savedJob.getId(), generated.token().getExpiresAt());
    }

    @Transactional
    public User activate(String rawToken, String password) {
        String tokenHash = activationTokenService.hashToken(rawToken);
        ActivationToken token = activationTokenRepository.findByTokenHash(tokenHash)
            .orElseThrow(() -> new BadCredentialsException("Invalid activation token"));

        LocalDateTime now = LocalDateTime.now();
        if (token.getUsedAt() != null) {
            throw new BadCredentialsException("Activation token already used");
        }
        if (token.getExpiresAt().isBefore(now)) {
            throw new BadCredentialsException("Activation token expired");
        }

        User user = token.getUser();
        if (user.getStatus() == UserStatus.DISABLED) {
            throw new BadCredentialsException("User account is disabled");
        }

        user.setPassword(passwordEncoder.encode(password));
        user.setStatus(UserStatus.ACTIVE);
        user.setIsActive(true);
        token.setUsedAt(now);
        activationTokenRepository.save(token);
        return userRepository.save(user);
    }

    @Data
    @AllArgsConstructor
    public static class QueuedActivation {
        private UUID emailJobId;
        private LocalDateTime expiresAt;
    }
}
