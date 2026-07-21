package com.sse.service;

import com.sse.entity.Critere;
import com.sse.entity.Evaluation;
import com.sse.entity.Reponse;
import com.sse.enums.StatusEvaluation;
import com.sse.enums.StatusReponse;
import com.sse.repository.EvaluationRepository;
import com.sse.repository.ReponseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReferenceEvaluationSyncService {

    private final EvaluationRepository evaluationRepository;
    private final ReponseRepository reponseRepository;

    @Transactional
    public int addCriterionToEvaluationsBeingFilled(Critere critere) {
        List<Reponse> additions = new ArrayList<>();
        for (Evaluation evaluation : evaluationRepository.findAllByStatus(StatusEvaluation.EN_COURS)) {
            if (reponseRepository.existsByEvaluationIdAndCritereId(evaluation.getId(), critere.getId())) {
                continue;
            }
            Reponse reponse = new Reponse();
            reponse.setEvaluation(evaluation);
            reponse.setCritere(critere);
            reponse.setStatus(StatusReponse.BROUILLON);
            additions.add(reponse);
        }
        reponseRepository.saveAll(additions);
        if (!additions.isEmpty()) {
            log.info("Added criterion {} to {} evaluations being filled", critere.getId(), additions.size());
        }
        return additions.size();
    }
}
