package com.sse.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "sse.mail")
public class SseMailProperties {

    private boolean enabled = false;
    private String from = "no-reply@sse.local";
    private String appUrl = "http://localhost:3000";
    private int activationTokenTtlHours = 48;
    private int jobMaxAttempts = 5;
    private int jobRetryDelayMinutes = 15;
    private int jobBatchSize = 20;
}
