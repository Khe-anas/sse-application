package com.sse.service;

import com.sse.dto.*;
import com.sse.entity.Evaluation;
import com.sse.entity.GlobalScore;
import com.sse.enums.StatusEvaluation;
import com.sse.enums.TypeOrganisme;
import com.sse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {
    
    private final OrganismeRepository organismeRepository;
    private final UserRepository userRepository;
    private final EvaluationRepository evaluationRepository;
    private final GlobalScoreRepository globalScoreRepository;
    private final PrincipeRepository principeRepository;
    
    public DashboardKPIs getGlobalKPIs() {
        int currentYear = java.time.Year.now().getValue();
        
        return new DashboardKPIs(
            organismeRepository.countActive(),
            userRepository.countByIsActiveTrue(),
            evaluationRepository.countByStatus(StatusEvaluation.EN_COURS),
            evaluationRepository.countByStatus(StatusEvaluation.VALIDEE),
            evaluationRepository.countByStatus(StatusEvaluation.SOUMISE),
            evaluationRepository.findAverageScoreByYear(currentYear),
            (long) evaluationRepository.findPendingValidations().size()
        );
    }
    
    public List<RankingItem> getRanking(Integer year, TypeOrganisme type) {
        if (year == null) {
            year = java.time.Year.now().getValue();
        }
        final Integer rankingYear = year;
        
        List<GlobalScore> scores;
        if (type != null) {
            scores = globalScoreRepository.findRankingByTypeAndYear(type, rankingYear);
        } else {
            scores = globalScoreRepository.findRankingByYear(rankingYear);
        }
        
        List<RankingItem> ranking = new ArrayList<>();
        for (int i = 0; i < scores.size(); i++) {
            GlobalScore gs = scores.get(i);
            RankingItem item = new RankingItem();
            item.setRank(i + 1);
            item.setOrganismeId(gs.getOrganisme().getId());
            item.setOrganismeName(gs.getOrganisme().getName());
            item.setType(gs.getOrganisme().getType());
            item.setScore(gs.getScore());
            item.setMaturityLevel(gs.getMaturityLevel());
            item.setYear(gs.getYear());
            
            // Determine trend
            List<GlobalScore> history = globalScoreRepository.findByOrganismeIdOrderByYearDesc(gs.getOrganisme().getId());
            if (history.size() > 1) {
                GlobalScore previous = history.stream()
                    .filter(h -> h.getYear() < rankingYear)
                    .findFirst()
                    .orElse(null);
                if (previous != null) {
                    if (gs.getScore() > previous.getScore()) item.setTrend("UP");
                    else if (gs.getScore() < previous.getScore()) item.setTrend("DOWN");
                    else item.setTrend("STABLE");
                } else {
                    item.setTrend("NEW");
                }
            } else {
                item.setTrend("NEW");
            }
            
            ranking.add(item);
        }
        
        return ranking;
    }
    
    public List<GapAnalysisItem> getGapAnalysis(UUID organismeId, Integer year) {
        if (year == null) {
            year = java.time.Year.now().getValue();
        }
        
        // Get organisme's evaluation for the year
        var evalOpt = evaluationRepository.findAllWithFilters(null, organismeId, year, 
            org.springframework.data.domain.Pageable.unpaged())
            .getContent().stream()
            .filter(e -> e.getStatus() == StatusEvaluation.VALIDEE)
            .findFirst();
        
        if (evalOpt.isEmpty()) {
            return new ArrayList<>();
        }
        
        var eval = evalOpt.get();
        var organismScores = eval.getScores();
        
        // Get averages
        Double globalAverage = globalScoreRepository.findAverageScoreByYear(year);
        
        List<GapAnalysisItem> items = new ArrayList<>();
        for (var score : organismScores) {
            var principe = score.getPrincipe();
            GapAnalysisItem item = new GapAnalysisItem();
            item.setPrincipeId(principe.getId());
            item.setPrincipeName(principe.getNameFr());
            item.setPrincipeNumber(principe.getNumber());
            item.setOrganismeScore(score.getScore());
            item.setAverageScore(globalAverage != null ? globalAverage.floatValue() : 0f);
            item.setGap(score.getScore() - (globalAverage != null ? globalAverage.floatValue() : 0f));
            
            // Generate recommendation
            if (score.getScore() < 25) {
                item.setRecommendation("Action urgente requise : mettre en place les fondamentaux du " + principe.getNameFr());
            } else if (score.getScore() < 50) {
                item.setRecommendation("Progression nécessaire : renforcer les pratiques de " + principe.getNameFr());
            } else if (score.getScore() < 75) {
                item.setRecommendation("Amélioration continue : consolider et formaliser le " + principe.getNameFr());
            } else {
                item.setRecommendation("Excellente performance : maintenir les standards de " + principe.getNameFr());
            }
            
            items.add(item);
        }
        
        return items;
    }
    
    public List<GlobalScore> getEvolution(UUID organismeId) {
        return globalScoreRepository.findByOrganismeIdOrderByYearDesc(organismeId);
    }
}
