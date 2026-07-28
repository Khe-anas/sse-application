package com.sse.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CritereTest {

    @Test
    void legacySettersCreateOneStructuredPreuveAndReference() {
        Critere critere = new Critere();

        critere.setPreuvesFr("Rapport annuel");
        critere.setPreuvesEn("Annual report");
        critere.setReferencesFr("Article 12");
        critere.setReferencesAr("الفصل 12");

        assertThat(critere.getPreuves()).hasSize(1);
        assertThat(critere.getPreuves().get(0).getCritere()).isSameAs(critere);
        assertThat(critere.getPreuvesFr()).isEqualTo("Rapport annuel");
        assertThat(critere.getPreuvesEn()).isEqualTo("Annual report");

        assertThat(critere.getReferences()).hasSize(1);
        assertThat(critere.getReferences().get(0).getCritere()).isSameAs(critere);
        assertThat(critere.getReferencesFr()).isEqualTo("Article 12");
        assertThat(critere.getReferencesAr()).isEqualTo("الفصل 12");
    }

    @Test
    void aggregateGettersExposeSeveralStructuredValuesForBackwardCompatibility() {
        Critere critere = new Critere();
        Preuve first = preuve(critere, 0, "Procès-verbal");
        Preuve second = preuve(critere, 1, "Capture d’écran");
        critere.getPreuves().add(first);
        critere.getPreuves().add(second);

        assertThat(critere.getPreuvesFr()).isEqualTo("Procès-verbal\nCapture d’écran");
    }

    @Test
    void blankLegacyValuesDoNotCreateEmptyChildren() {
        Critere critere = new Critere();

        critere.setPreuvesFr(" ");
        critere.setReferencesFr(null);

        assertThat(critere.getPreuves()).isEmpty();
        assertThat(critere.getReferences()).isEmpty();
    }

    private Preuve preuve(Critere critere, int order, String text) {
        Preuve preuve = new Preuve();
        preuve.setCritere(critere);
        preuve.setDisplayOrder(order);
        preuve.setTexteFr(text);
        return preuve;
    }
}
