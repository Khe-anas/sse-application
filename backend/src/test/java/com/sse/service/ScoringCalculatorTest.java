package com.sse.service;

import com.sse.entity.Reponse;
import com.sse.enums.Niveau;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ScoringCalculatorTest {

    private final ScoringCalculator calculator = new ScoringCalculator();

    @Test
    void adaptsTheDenominatorToTheNumberOfCriteria() {
        assertThat(calculator.percentage(List.of(response(Niveau.N0), response(Niveau.N3))))
            .isEqualTo(50f);
        assertThat(calculator.percentage(List.of(response(Niveau.N3), response(Niveau.N3), response(Niveau.N3))))
            .isEqualTo(100f);
    }

    @Test
    void countsAnUnansweredCriterionInTheDynamicDenominator() {
        assertThat(calculator.percentage(List.of(response(Niveau.N3), response(null))))
            .isEqualTo(50f);
    }

    @Test
    void emptySectionsDoNotProducePoints() {
        assertThat(calculator.percentage(List.of())).isZero();
    }

    private Reponse response(Niveau niveau) {
        Reponse response = new Reponse();
        response.setNiveau(niveau);
        return response;
    }
}
