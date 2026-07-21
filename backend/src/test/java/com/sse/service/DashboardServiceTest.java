package com.sse.service;

import com.sse.dto.RankingItem;
import com.sse.entity.GlobalScore;
import com.sse.entity.Organisme;
import com.sse.enums.MaturityLevel;
import com.sse.enums.TypeOrganisme;
import com.sse.repository.EvaluationRepository;
import com.sse.repository.GlobalScoreRepository;
import com.sse.repository.OrganismeRepository;
import com.sse.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private OrganismeRepository organismeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EvaluationRepository evaluationRepository;

    @Mock
    private GlobalScoreRepository globalScoreRepository;

    @InjectMocks
    private DashboardService dashboardService;

    @Test
    void rankingLoadsPreviousScoresInOneBatch() {
        GlobalScore first = score("Premier", 2026, 75f);
        GlobalScore second = score("Nouveau", 2026, 60f);
        GlobalScore previousFirst = score(first.getOrganisme(), 2025, 70f);
        List<UUID> ids = List.of(first.getOrganisme().getId(), second.getOrganisme().getId());

        when(globalScoreRepository.findRankingByYear(2026)).thenReturn(List.of(first, second));
        when(globalScoreRepository.findHistoryBeforeYear(ids, 2026)).thenReturn(List.of(previousFirst));

        List<RankingItem> ranking = dashboardService.getRanking(2026, null);

        assertThat(ranking).extracting(RankingItem::getTrend).containsExactly("UP", "NEW");
        verify(globalScoreRepository).findHistoryBeforeYear(ids, 2026);
    }

    private GlobalScore score(String organismeName, int year, float value) {
        Organisme organisme = new Organisme();
        organisme.setId(UUID.randomUUID());
        organisme.setName(organismeName);
        organisme.setType(TypeOrganisme.PUBLIC);
        return score(organisme, year, value);
    }

    private GlobalScore score(Organisme organisme, int year, float value) {
        GlobalScore score = new GlobalScore();
        score.setId(UUID.randomUUID());
        score.setOrganisme(organisme);
        score.setYear(year);
        score.setScore(value);
        score.setMaturityLevel(MaturityLevel.AVANCE);
        return score;
    }
}
