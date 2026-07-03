package com.sse.service;

import com.sse.config.SseMailProperties;
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

        send(request.getCompanyEmail(), subject, body);
    }

    private void send(String to, String subject, String body) {
        if (!mailProperties.isEnabled()) {
            log.warn("Mail disabled. Would send '{}' to {}.", subject, to);
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

}
