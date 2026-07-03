package com.sse.service;

import com.sse.config.SseMailProperties;
import com.sse.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ActivationEmailTemplateService {

    private final SseMailProperties mailProperties;

    public String activationSubject() {
        return "Activez votre compte SSE";
    }

    public String activationBody(User user, String rawToken) {
        String activationUrl = trimTrailingSlash(mailProperties.getAppUrl()) + "/activate-account?token=" + rawToken;
        return """
            Bonjour %s,

            Votre compte SSE a été préparé par l'administration.

            Identifiant : %s

            Pour définir votre mot de passe et activer le compte, ouvrez ce lien :
            %s

            Ce lien est personnel, à usage unique, et expire dans %d heures.
            Si le lien expire, contactez l'administrateur pour renvoyer l'email d'activation.
            """.formatted(
            user.getFullName(),
            user.getEmail(),
            activationUrl,
            mailProperties.getActivationTokenTtlHours()
        );
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "http://localhost:3000";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
