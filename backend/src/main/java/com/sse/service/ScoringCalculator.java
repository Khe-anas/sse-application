package com.sse.service;

import com.sse.entity.Reponse;
import com.sse.enums.Niveau;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ScoringCalculator {

    public float percentage(List<Reponse> responses) {
        if (responses == null || responses.isEmpty() || Niveau.maxPoints() <= 0) {
            return 0f;
        }

        int earnedPoints = responses.stream()
            .map(Reponse::getNiveau)
            .filter(java.util.Objects::nonNull)
            .mapToInt(Niveau::getPoints)
            .sum();
        int possiblePoints = responses.size() * Niveau.maxPoints();
        return ((float) earnedPoints / possiblePoints) * 100f;
    }
}
