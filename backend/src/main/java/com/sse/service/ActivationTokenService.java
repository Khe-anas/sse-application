package com.sse.service;

import com.sse.config.SseMailProperties;
import com.sse.entity.ActivationToken;
import com.sse.entity.User;
import com.sse.repository.ActivationTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class ActivationTokenService {

    private static final int TOKEN_BYTES = 32;

    private final ActivationTokenRepository activationTokenRepository;
    private final SseMailProperties mailProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public GeneratedActivationToken createToken(User user) {
        String rawToken = generateRawToken();
        ActivationToken token = new ActivationToken();
        token.setUser(user);
        token.setTokenHash(hashToken(rawToken));
        token.setExpiresAt(LocalDateTime.now().plusHours(mailProperties.getActivationTokenTtlHours()));
        return new GeneratedActivationToken(rawToken, activationTokenRepository.save(token));
    }

    public String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private String generateRawToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public record GeneratedActivationToken(String rawToken, ActivationToken token) {
    }
}
