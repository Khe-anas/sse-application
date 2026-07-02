package com.sse.service;

import com.sse.entity.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class NotificationStreamService {

    private static final long STREAM_TIMEOUT_MS = 30L * 60L * 1000L;

    private final Map<UUID, CopyOnWriteArrayList<SseEmitter>> emittersByUser = new ConcurrentHashMap<>();

    public SseEmitter subscribe(UUID userId) {
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        emittersByUser.computeIfAbsent(userId, key -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> {
            remove(userId, emitter);
            emitter.complete();
        });
        emitter.onError(error -> remove(userId, emitter));

        send(userId, emitter, "connected", Map.of("connected", true));
        return emitter;
    }

    public void publish(Notification notification) {
        UUID userId = notification.getUser().getId();
        List<SseEmitter> emitters = emittersByUser.get(userId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        Map<String, Object> payload = toPayload(notification);
        for (SseEmitter emitter : emitters) {
            send(userId, emitter, "notification", payload);
        }
    }

    private void send(UUID userId, SseEmitter emitter, String eventName, Object payload) {
        try {
            emitter.send(SseEmitter.event().name(eventName).data(payload));
        } catch (IOException | IllegalStateException ex) {
            remove(userId, emitter);
            log.debug("Removed closed notification stream for user {}", userId);
        }
    }

    private void remove(UUID userId, SseEmitter emitter) {
        List<SseEmitter> emitters = emittersByUser.get(userId);
        if (emitters == null) {
            return;
        }

        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            emittersByUser.remove(userId);
        }
    }

    private Map<String, Object> toPayload(Notification notification) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", notification.getId());
        payload.put("type", notification.getType());
        payload.put("titleFr", notification.getTitleFr());
        payload.put("titleAr", notification.getTitleAr());
        payload.put("titleEn", notification.getTitleEn());
        payload.put("messageFr", notification.getMessageFr());
        payload.put("messageAr", notification.getMessageAr());
        payload.put("messageEn", notification.getMessageEn());
        payload.put("isRead", notification.getIsRead());
        payload.put("link", notification.getLink());
        payload.put("createdAt", notification.getCreatedAt());
        return payload;
    }
}
