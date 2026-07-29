package com.sse.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.sse.dto.ReferenceTranslationResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
public class ReferenceTranslationService {

    private static final int MAX_FIELDS = 10;
    private static final int MAX_CHUNK_BYTES = 450;
    private static final long RATE_LIMIT_BACKOFF_MILLIS = Duration.ofHours(1).toMillis();
    private static final long PROVIDER_ERROR_BACKOFF_MILLIS = Duration.ofMinutes(2).toMillis();

    private final RestClient primaryRestClient;
    private final RestClient fallbackRestClient;
    private final boolean enabled;
    private final boolean fallbackEnabled;
    private final String contactEmail;
    private final Map<String, String> cache = new ConcurrentHashMap<>();
    private final AtomicLong primaryRetryAfter = new AtomicLong(0);

    public ReferenceTranslationService(
        @Value("${sse.translation.enabled:true}") boolean enabled,
        @Value("${sse.translation.api-url:https://api.mymemory.translated.net}") String apiUrl,
        @Value("${sse.translation.fallback-enabled:true}") boolean fallbackEnabled,
        @Value("${sse.translation.fallback-api-url:https://translate.googleapis.com}") String fallbackApiUrl,
        @Value("${sse.translation.contact-email:}") String contactEmail
    ) {
        this(createRestClient(apiUrl), createRestClient(fallbackApiUrl), enabled, fallbackEnabled, contactEmail);
    }

    ReferenceTranslationService(
        RestClient primaryRestClient,
        RestClient fallbackRestClient,
        boolean enabled,
        boolean fallbackEnabled,
        String contactEmail
    ) {
        this.primaryRestClient = primaryRestClient;
        this.fallbackRestClient = fallbackRestClient;
        this.enabled = enabled;
        this.fallbackEnabled = fallbackEnabled;
        this.contactEmail = contactEmail;
    }

    private static RestClient createRestClient(String baseUrl) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(8000);
        return RestClient.builder()
            .baseUrl(baseUrl)
            .requestFactory(requestFactory)
            .build();
    }

    public ReferenceTranslationResponse translateFields(Map<String, String> sourceFields) {
        if (!enabled) {
            throw new IllegalStateException("Automatic translation is disabled");
        }
        if (sourceFields == null || sourceFields.isEmpty()) {
            return new ReferenceTranslationResponse(Map.of(), "automatic-translation");
        }
        if (sourceFields.size() > MAX_FIELDS) {
            throw new IllegalArgumentException("Too many fields to translate");
        }

        Map<String, ReferenceTranslationResponse.TranslationValue> translated = new LinkedHashMap<>();
        sourceFields.forEach((key, value) -> {
            if (key == null || !key.matches("[A-Za-z0-9_-]{1,60}") || value == null || value.isBlank()) {
                return;
            }
            translated.put(key, new ReferenceTranslationResponse.TranslationValue(
                translate(value, "en"),
                translate(value, "ar")
            ));
        });

        return new ReferenceTranslationResponse(translated, "automatic-translation");
    }

    public LocalizedText complete(String sourceFr, String currentEn, String currentAr) {
        if (sourceFr == null || sourceFr.isBlank()) {
            return new LocalizedText(currentEn, currentAr);
        }

        String english = isBlank(currentEn) ? translate(sourceFr, "en") : currentEn;
        String arabic = isBlank(currentAr) ? translate(sourceFr, "ar") : currentAr;
        return new LocalizedText(english, arabic);
    }

    private String translate(String source, String targetLanguage) {
        String normalized = source.trim();
        String cacheKey = targetLanguage + "\n" + normalized;
        return cache.computeIfAbsent(cacheKey, ignored -> translateUncached(normalized, targetLanguage));
    }

    private String translateUncached(String source, String targetLanguage) {
        try {
            return splitIntoChunks(source).stream()
                .map(chunk -> translateChunk(chunk, targetLanguage))
                .reduce((left, right) -> left + " " + right)
                .orElse("");
        } catch (RuntimeException exception) {
            log.warn("Automatic translation failed for target {}: {}", targetLanguage, exception.getMessage());
            throw new IllegalStateException("Automatic translation is temporarily unavailable", exception);
        }
    }

    private String translateChunk(String source, String targetLanguage) {
        RuntimeException primaryFailure = null;
        if (System.currentTimeMillis() >= primaryRetryAfter.get()) {
            try {
                return translateWithPrimaryProvider(source, targetLanguage);
            } catch (RestClientResponseException exception) {
                long backoff = exception.getStatusCode().value() == 429
                    ? RATE_LIMIT_BACKOFF_MILLIS
                    : PROVIDER_ERROR_BACKOFF_MILLIS;
                primaryRetryAfter.set(System.currentTimeMillis() + backoff);
                primaryFailure = exception;
                log.warn(
                    "Primary translation provider unavailable (HTTP {}). Falling back for {} ms.",
                    exception.getStatusCode().value(),
                    backoff
                );
            } catch (RuntimeException exception) {
                primaryRetryAfter.set(System.currentTimeMillis() + PROVIDER_ERROR_BACKOFF_MILLIS);
                primaryFailure = exception;
                log.warn("Primary translation provider unavailable. Using fallback: {}", exception.getMessage());
            }
        }

        if (!fallbackEnabled) {
            throw new IllegalStateException("Primary translation provider is unavailable", primaryFailure);
        }

        try {
            return translateWithFallbackProvider(source, targetLanguage);
        } catch (RuntimeException fallbackFailure) {
            if (primaryFailure != null) {
                fallbackFailure.addSuppressed(primaryFailure);
            }
            throw new IllegalStateException("All translation providers are unavailable", fallbackFailure);
        }
    }

    private String translateWithPrimaryProvider(String source, String targetLanguage) {
        JsonNode response = primaryRestClient.get()
            .uri(uriBuilder -> {
                var builder = uriBuilder.path("/get")
                    .queryParam("q", source)
                    .queryParam("langpair", "fr|" + targetLanguage)
                    .queryParam("mt", "1");
                if (!contactEmail.isBlank()) {
                    builder.queryParam("de", contactEmail);
                }
                return builder.build();
            })
            .retrieve()
            .body(JsonNode.class);

        if (response == null || response.path("responseStatus").asInt(200) >= 400) {
            throw new IllegalStateException("Translation provider rejected the request");
        }

        String translated = response.path("responseData").path("translatedText").asText();
        if (translated == null || translated.isBlank()) {
            throw new IllegalStateException("Translation provider returned an empty result");
        }
        return HtmlUtils.htmlUnescape(translated).trim();
    }

    private String translateWithFallbackProvider(String source, String targetLanguage) {
        JsonNode response = fallbackRestClient.get()
            .uri(uriBuilder -> uriBuilder.path("/translate_a/single")
                .queryParam("client", "gtx")
                .queryParam("sl", "fr")
                .queryParam("tl", targetLanguage)
                .queryParam("dt", "t")
                .queryParam("q", source)
                .build())
            .retrieve()
            .body(JsonNode.class);

        if (response == null || !response.isArray() || response.isEmpty() || !response.path(0).isArray()) {
            throw new IllegalStateException("Fallback translation provider returned an invalid result");
        }

        StringBuilder translated = new StringBuilder();
        response.path(0).forEach(segment -> {
            String text = segment.path(0).asText();
            if (!text.isBlank()) {
                translated.append(text);
            }
        });
        if (translated.isEmpty()) {
            throw new IllegalStateException("Fallback translation provider returned an empty result");
        }
        return HtmlUtils.htmlUnescape(translated.toString()).trim();
    }

    private List<String> splitIntoChunks(String source) {
        if (source.getBytes(StandardCharsets.UTF_8).length <= MAX_CHUNK_BYTES) {
            return List.of(source);
        }

        java.util.ArrayList<String> chunks = new java.util.ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String token : source.split("(?<=\\s)")) {
            if ((current + token).getBytes(StandardCharsets.UTF_8).length > MAX_CHUNK_BYTES && !current.isEmpty()) {
                chunks.add(current.toString().trim());
                current.setLength(0);
            }

            if (token.getBytes(StandardCharsets.UTF_8).length <= MAX_CHUNK_BYTES) {
                current.append(token);
                continue;
            }

            token.codePoints().forEach(codePoint -> {
                String character = new String(Character.toChars(codePoint));
                if ((current + character).getBytes(StandardCharsets.UTF_8).length > MAX_CHUNK_BYTES && !current.isEmpty()) {
                    chunks.add(current.toString().trim());
                    current.setLength(0);
                }
                current.append(character);
            });
        }
        if (!current.isEmpty()) {
            chunks.add(current.toString().trim());
        }
        return chunks;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record LocalizedText(String en, String ar) {
    }
}
