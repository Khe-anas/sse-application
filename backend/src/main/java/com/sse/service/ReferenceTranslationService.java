package com.sse.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.sse.dto.ReferenceTranslationResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class ReferenceTranslationService {

    private static final int MAX_FIELDS = 10;
    private static final int MAX_CHUNK_BYTES = 450;

    private final RestClient restClient;
    private final boolean enabled;
    private final String contactEmail;
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public ReferenceTranslationService(
        @Value("${sse.translation.enabled:true}") boolean enabled,
        @Value("${sse.translation.api-url:https://api.mymemory.translated.net}") String apiUrl,
        @Value("${sse.translation.contact-email:}") String contactEmail
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(8000);
        this.restClient = RestClient.builder()
            .baseUrl(apiUrl)
            .requestFactory(requestFactory)
            .build();
        this.enabled = enabled;
        this.contactEmail = contactEmail;
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
        JsonNode response = restClient.get()
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
