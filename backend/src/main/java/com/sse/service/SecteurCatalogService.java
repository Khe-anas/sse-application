package com.sse.service;

import com.sse.entity.Secteur;
import com.sse.repository.SecteurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SecteurCatalogService {

    private final SecteurRepository secteurRepository;

    @Transactional
    public String normalizeAndEnsure(String value) {
        String code = normalize(value);
        if (code == null) {
            return null;
        }

        UUID id = UUID.nameUUIDFromBytes(("secteur:" + code).getBytes(StandardCharsets.UTF_8));
        secteurRepository.insertIfMissing(id, code, toLabel(code));
        return code;
    }

    @Transactional(readOnly = true)
    public List<Secteur> getActiveSectors() {
        return secteurRepository.findByActiveTrueOrderByLabelAsc();
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String toLabel(String code) {
        if (!code.matches("[A-Z0-9_]+")) {
            return code;
        }

        String normalized = code.replace('_', ' ').toLowerCase(Locale.FRENCH);
        return Character.toUpperCase(normalized.charAt(0)) + normalized.substring(1);
    }
}
