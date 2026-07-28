package com.sse.service;

import com.sse.repository.SecteurRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isA;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SecteurCatalogServiceTest {

    @Mock
    private SecteurRepository secteurRepository;

    @InjectMocks
    private SecteurCatalogService secteurCatalogService;

    @Test
    void registersAFreeTextSectorBeforeItIsUsedAsAForeignKey() {
        String code = secteurCatalogService.normalizeAndEnsure("  Economie sociale  ");

        assertThat(code).isEqualTo("Economie sociale");
        verify(secteurRepository).insertIfMissing(
            isA(UUID.class),
            eq("Economie sociale"),
            eq("Economie sociale")
        );
    }

    @Test
    void convertsCatalogCodesToReadableLabels() {
        secteurCatalogService.normalizeAndEnsure("PUBLIC_ADMINISTRATION");

        verify(secteurRepository).insertIfMissing(
            isA(UUID.class),
            eq("PUBLIC_ADMINISTRATION"),
            eq("Public administration")
        );
    }

    @Test
    void ignoresBlankSectors() {
        assertThat(secteurCatalogService.normalizeAndEnsure(" ")).isNull();
        verify(secteurRepository, never()).insertIfMissing(
            isA(UUID.class),
            isA(String.class),
            isA(String.class)
        );
    }
}
