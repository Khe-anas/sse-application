package com.sse.dto;

import java.util.Map;

public record ReferenceTranslationResponse(
    Map<String, TranslationValue> fields,
    String provider
) {
    public record TranslationValue(String en, String ar) {
    }
}
