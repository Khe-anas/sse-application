package com.sse.service;

import com.sse.config.SseMailProperties;
import com.sse.dto.UserResponse;
import com.sse.entity.AccountRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccountRequestEmailService {

    private final JavaMailSender mailSender;
    private final SseMailProperties mailProperties;

    @Async
    public void sendApproved(AccountRequest request, UserResponse user, String temporaryPassword) {
        String subject = "Votre compte SSE a été approuvé";
        String body = """
            Bonjour %s,

            Votre demande de compte responsable pour %s a été approuvée.

            Vous pouvez vous connecter avec les informations suivantes :
            Identifiant : %s
            Mot de passe temporaire : %s

            Lien de connexion : %s/login

            Pour votre sécurité, changez le mot de passe après votre première connexion.
            """.formatted(
            request.getResponsibleFullName(),
            request.getCompanyName(),
            user.getEmail(),
            temporaryPassword,
            trimTrailingSlash(mailProperties.getAppUrl())
        );

        send(request.getCompanyEmail(), subject, body, true);
    }

    @Async
    public void sendRejected(AccountRequest request, String reason) {
        String subject = "Votre demande de compte SSE a été rejetée";
        String body = """
            Bonjour %s,

            Votre demande de compte responsable pour %s a été rejetée.

            Motif :
            %s

            Vous pouvez soumettre une nouvelle demande après correction si nécessaire.
            """.formatted(
            request.getResponsibleFullName(),
            request.getCompanyName(),
            reason
        );

        send(request.getCompanyEmail(), subject, body, false);
    }

    private void send(String to, String subject, String body, boolean containsCredentials) {
        if (!mailProperties.isEnabled()) {
            log.warn("Mail disabled. Would send '{}' to {}{}.",
                subject,
                to,
                containsCredentials ? " with generated account credentials" : "");
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailProperties.getFrom());
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Account request email sent to {}", to);
        } catch (Exception ex) {
            log.error("Could not send account request email to {}", to, ex);
        }
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "http://localhost:3000";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
