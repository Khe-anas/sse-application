package com.sse.service;

import com.sse.dto.*;
import com.sse.entity.*;
import com.sse.enums.*;
import com.sse.exception.ResourceLockedException;
import com.sse.repository.*;
import com.sse.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EvaluationService {

    private static final long VALIDATION_LOCK_TIMEOUT_MINUTES = 10;
    
    private final EvaluationRepository evaluationRepository;
    private final OrganismeRepository organismeRepository;
    private final PrincipeRepository principeRepository;
    private final CritereRepository critereRepository;
    private final ReponseRepository reponseRepository;
    private final ScorePrincipeRepository scorePrincipeRepository;
    private final GlobalScoreRepository globalScoreRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final CurrentUserService currentUserService;

    @Transactional
    public void ensureReponsesForExistingEvaluations() {
        List<Critere> criteres = critereRepository.findAll();
        if (criteres.isEmpty()) {
            log.info("No criteria found, skipping response backfill");
            return;
        }

        int createdCount = 0;
        for (Evaluation evaluation : evaluationRepository.findAll()) {
            Set<UUID> existingCritereIds = reponseRepository.findByEvaluationId(evaluation.getId()).stream()
                .map(reponse -> reponse.getCritere().getId())
                .collect(Collectors.toSet());

            for (Critere critere : criteres) {
                if (existingCritereIds.contains(critere.getId())) {
                    continue;
                }

                Reponse reponse = new Reponse();
                reponse.setEvaluation(evaluation);
                reponse.setCritere(critere);
                reponse.setStatus(StatusReponse.BROUILLON);
                reponseRepository.save(reponse);
                createdCount++;
            }
        }

        if (createdCount > 0) {
            log.info("Backfilled {} missing evaluation responses", createdCount);
        }
    }
    
    @Transactional
    public EvaluationResponse createEvaluation(CreateEvaluationRequest request) {
        Organisme organisme = organismeRepository.findById(request.getOrganismeId())
            .orElseThrow(() -> new RuntimeException("Organisme not found"));
        
        // Check if active evaluation already exists for this organisme and year
        List<Evaluation> existing = evaluationRepository.findActiveByOrganismeAndYear(
            request.getOrganismeId(), request.getYear());
        if (!existing.isEmpty()) {
            throw new RuntimeException("An active evaluation already exists for this organisme and year");
        }
        
        Evaluation evaluation = new Evaluation();
        evaluation.setOrganisme(organisme);
        evaluation.setYear(request.getYear());
        evaluation.setStatus(StatusEvaluation.EN_COURS);
        evaluation.setComments(request.getComments());
        
        Evaluation saved = evaluationRepository.save(evaluation);
        
        // Create empty reponses for all criteres
        List<Principe> principes = principeRepository.findAllActiveWithBonnesPratiques();
        principes.forEach(this::initializeCriteres);
        for (Principe principe : principes) {
            for (BonnePratique bp : principe.getBonnesPratiques()) {
                for (Critere critere : bp.getCriteres()) {
                    Reponse reponse = new Reponse();
                    reponse.setEvaluation(saved);
                    reponse.setCritere(critere);
                    reponse.setStatus(StatusReponse.BROUILLON);
                    reponseRepository.save(reponse);
                }
            }
        }
        
        log.info("Created evaluation {} for organisme {}", saved.getId(), organisme.getName());
        
        // Notify responsable
        List<User> responsables = organisme.getUsers().stream()
            .filter(u -> u.getRole() == Role.RESPONSABLE && u.getIsActive())
            .toList();
        for (User resp : responsables) {
            notificationService.sendEvaluationAssigned(resp.getId(), organisme.getName(), request.getYear(), saved.getId());
        }
        
        return mapToResponse(saved);
    }
    
    @Transactional
    public Page<EvaluationResponse> getEvaluations(StatusEvaluation status, UUID organismeId, Integer year, Pageable pageable) {
        Page<Evaluation> evaluations = evaluationRepository.findAllWithFilters(status, organismeId, year, pageable);
        evaluations.forEach(this::releaseExpiredValidationLock);
        return evaluations
            .map(this::mapToResponse);
    }
    
    public EvaluationResponse getEvaluationById(UUID id) {
        Evaluation eval = evaluationRepository.findByIdWithDetails(id)
            .orElseThrow(() -> new RuntimeException("Evaluation not found"));
        return mapToResponse(eval);
    }

    @Transactional
    public EvaluationResponse claimValidation(UUID id) {
        User admin = currentUserService.getCurrentUser();
        Evaluation eval = evaluationRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new RuntimeException("Evaluation not found"));

        claimValidationForAdmin(eval, admin);
        return mapToResponse(evaluationRepository.save(eval));
    }

    @Transactional
    public void releaseValidation(UUID id) {
        User admin = currentUserService.getCurrentUser();
        Evaluation eval = evaluationRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new RuntimeException("Evaluation not found"));

        User openedBy = eval.getValidationOpenedBy();
        if (openedBy != null && openedBy.getId().equals(admin.getId())) {
            clearValidationLock(eval);
            if (eval.getStatus() == StatusEvaluation.EN_VALIDATION) {
                eval.setStatus(StatusEvaluation.SOUMISE);
            }
            evaluationRepository.save(eval);
        }
    }
    
    public List<EvaluationResponse> getEvaluationsByOrganisme(UUID organismeId) {
        return evaluationRepository.findByOrganismeIdOrderByYearDesc(organismeId)
            .stream().map(this::mapToResponse).toList();
    }
    
    @Transactional
    public EvaluationResponse submitEvaluation(UUID id) {
        Evaluation eval = evaluationRepository.findByIdWithDetails(id)
            .orElseThrow(() -> new RuntimeException("Evaluation not found"));
        
        if (eval.getStatus() != StatusEvaluation.EN_COURS) {
            throw new RuntimeException("Evaluation can only be submitted from EN_COURS status");
        }
        
        // Check all reponses have a niveau
        List<Reponse> reponses = reponseRepository.findByEvaluationId(id);
        boolean allAnswered = reponses.stream().allMatch(r -> r.getNiveau() != null);
        if (!allAnswered) {
            throw new RuntimeException("All criteria must be answered before submission");
        }

        boolean hasUnaddressedCorrections = reponses.stream().anyMatch(r ->
            r.getStatus() == StatusReponse.A_CORRIGER && !Boolean.TRUE.equals(r.getCorrectionAddressed())
        );
        if (hasUnaddressedCorrections) {
            throw new RuntimeException("All requested corrections must be updated before submission");
        }
        
        eval.setStatus(StatusEvaluation.SOUMISE);
        eval.setSubmittedAt(LocalDateTime.now());
        clearValidationLock(eval);
        
        // Move only editable responses back to validation. Already reviewed responses keep their decision.
        for (Reponse r : reponses) {
            if (r.getStatus() == StatusReponse.BROUILLON || r.getStatus() == StatusReponse.A_CORRIGER) {
                r.setStatus(StatusReponse.SOUMISE);
                r.setCorrectionAddressed(false);
            }
        }
        
        Evaluation saved = evaluationRepository.save(eval);
        log.info("Evaluation {} submitted", id);
        
        List<User> admins = userRepository.findByRoleInAndIsActiveTrue(List.of(Role.ADMIN));
        for (User admin : admins) {
            notificationService.sendEvaluationSubmitted(admin.getId(), eval.getOrganisme().getName(), eval.getYear());
        }
        
        return mapToResponse(saved);
    }
    
    @Transactional
    public EvaluationResponse validateEvaluation(UUID id, ValidateEvaluationRequest request) {
        User admin = currentUserService.getCurrentUser();
        Evaluation eval = evaluationRepository.findByIdWithDetails(id)
            .orElseThrow(() -> new RuntimeException("Evaluation not found"));
        
        if (eval.getStatus() != StatusEvaluation.SOUMISE && eval.getStatus() != StatusEvaluation.EN_VALIDATION) {
            throw new RuntimeException("Evaluation must be SOUMISE or EN_VALIDATION to validate");
        }
        ensureValidationOwner(eval, admin);

        List<Reponse> reponses = reponseRepository.findByEvaluationId(id);
        boolean allReviewed = reponses.stream().allMatch(this::hasAdminDecision);
        if (!allReviewed) {
            throw new RuntimeException("All criteria must have an admin action before validating the evaluation");
        }
        
        // Calculate scores
        calculateAndStoreScores(eval);
        
        // Determine maturity level
        float globalScore = eval.getGlobalScore() != null ? eval.getGlobalScore() : 0f;
        MaturityLevel level = determineMaturityLevel(globalScore);
        
        eval.setStatus(StatusEvaluation.VALIDEE);
        eval.setValidatedAt(LocalDateTime.now());
        eval.setMaturityLevel(level);
        if (request.getComments() != null) {
            eval.setComments(request.getComments());
        }
        clearValidationLock(eval);
        
        Evaluation saved = evaluationRepository.save(eval);
        
        // Update global ranking
        updateRanking(eval.getYear());
        
        // Create GlobalScore entry
        GlobalScore gs = new GlobalScore();
        gs.setOrganisme(eval.getOrganisme());
        gs.setYear(eval.getYear());
        gs.setScore(globalScore);
        gs.setMaturityLevel(level);
        globalScoreRepository.save(gs);
        
        log.info("Evaluation {} validated with score {} and level {}", id, globalScore, level);
        
        // Notify responsable
        List<User> responsables = eval.getOrganisme().getUsers().stream()
            .filter(u -> u.getRole() == Role.RESPONSABLE && u.getIsActive())
            .toList();
        for (User resp : responsables) {
            notificationService.sendEvaluationValidated(resp.getId(), eval.getOrganisme().getName(), globalScore, level, eval.getId());
        }
        
        return mapToResponse(saved);
    }
    
    @Transactional
    public EvaluationResponse rejectEvaluation(UUID id, String reason) {
        User admin = currentUserService.getCurrentUser();
        Evaluation eval = evaluationRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new RuntimeException("Evaluation not found"));

        if (eval.getStatus() != StatusEvaluation.SOUMISE && eval.getStatus() != StatusEvaluation.EN_VALIDATION) {
            throw new RuntimeException("Evaluation must be SOUMISE or EN_VALIDATION to reject");
        }
        ensureValidationOwner(eval, admin);
        
        eval.setStatus(StatusEvaluation.REJETEE);
        clearValidationLock(eval);
        evaluationRepository.save(eval);
        
        log.info("Evaluation {} rejected: {}", id, reason);

        List<User> responsables = eval.getOrganisme().getUsers().stream()
            .filter(u -> u.getRole() == Role.RESPONSABLE && u.getIsActive())
            .toList();
        for (User resp : responsables) {
            notificationService.sendEvaluationRejected(resp.getId(), eval.getOrganisme().getName(), reason);
        }

        return mapToResponse(eval);
    }
    
    @Transactional
    public EvaluationResponse requestCorrection(UUID id, String reason) {
        User admin = currentUserService.getCurrentUser();
        Evaluation eval = evaluationRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new RuntimeException("Evaluation not found"));

        if (eval.getStatus() != StatusEvaluation.SOUMISE && eval.getStatus() != StatusEvaluation.EN_VALIDATION) {
            throw new RuntimeException("Evaluation must be SOUMISE or EN_VALIDATION to request correction");
        }
        ensureValidationOwner(eval, admin);
        
        eval.setStatus(StatusEvaluation.EN_COURS);
        clearValidationLock(eval);
        evaluationRepository.save(eval);
        
        // Set all SOUMISE reponses to A_CORRIGER
        List<Reponse> reponses = reponseRepository.findByEvaluationAndStatus(id, StatusReponse.SOUMISE);
        for (Reponse r : reponses) {
            r.setStatus(StatusReponse.A_CORRIGER);
            r.setCorrectionAddressed(false);
        }
        
        log.info("Evaluation {} sent back for correction: {}", id, reason);
        
        // Notify responsable
        List<User> responsables = eval.getOrganisme().getUsers().stream()
            .filter(u -> u.getRole() == Role.RESPONSABLE && u.getIsActive())
            .toList();
        for (User resp : responsables) {
            notificationService.sendCorrectionRequested(resp.getId(), eval.getOrganisme().getName(), reason, eval.getId());
        }
        
        return mapToResponse(eval);
    }
    
    private void calculateAndStoreScores(Evaluation eval) {
        List<Principe> principes = principeRepository.findAllActiveWithBonnesPratiques();
        principes.forEach(this::initializeCriteres);
        float totalWeightedScore = 0;
        float totalWeight = 0;
        
        // Clear existing scores
        scorePrincipeRepository.deleteAll(scorePrincipeRepository.findByEvaluationId(eval.getId()));
        
        for (Principe principe : principes) {
            List<Reponse> reponses = reponseRepository.findByEvaluationAndPrincipe(eval.getId(), principe.getId());
            
            int totalPoints = reponses.stream().mapToInt(r -> r.getNiveau() != null ? r.getNiveau().ordinal() : 0).sum();
            int maxPoints = reponses.size() * 3;
            float score = maxPoints > 0 ? ((float) totalPoints / maxPoints) * 100 : 0;
            
            ScorePrincipe sp = new ScorePrincipe();
            sp.setEvaluation(eval);
            sp.setPrincipe(principe);
            sp.setScore(score);
            sp.setMaxPossible(100f);
            sp.setWeight(principe.getWeight());
            scorePrincipeRepository.save(sp);
            
            totalWeightedScore += score * principe.getWeight();
            totalWeight += principe.getWeight();
        }
        
        float globalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
        eval.setGlobalScore(globalScore);
    }
    
    private MaturityLevel determineMaturityLevel(float score) {
        if (score < 25) return MaturityLevel.INITIAL;
        if (score < 50) return MaturityLevel.EN_PROGRESSION;
        if (score < 75) return MaturityLevel.AVANCE;
        return MaturityLevel.EXCELLENT;
    }

    private boolean hasAdminDecision(Reponse reponse) {
        return reponse.getStatus() == StatusReponse.VALIDEE
            || reponse.getStatus() == StatusReponse.REJETEE
            || reponse.getStatus() == StatusReponse.A_CORRIGER;
    }

    private void claimValidationForAdmin(Evaluation eval, User admin) {
        releaseExpiredValidationLock(eval);

        if (eval.getStatus() != StatusEvaluation.SOUMISE && eval.getStatus() != StatusEvaluation.EN_VALIDATION) {
            throw new RuntimeException("Only submitted evaluations can be examined");
        }

        User openedBy = eval.getValidationOpenedBy();
        if (openedBy == null) {
            eval.setValidationOpenedBy(admin);
            eval.setValidationOpenedAt(LocalDateTime.now());
            eval.setStatus(StatusEvaluation.EN_VALIDATION);
            return;
        }

        if (!openedBy.getId().equals(admin.getId())) {
            throw new ResourceLockedException("Cette validation est deja ouverte par " + openedBy.getFullName());
        }

        eval.setValidationOpenedAt(LocalDateTime.now());
        if (eval.getStatus() == StatusEvaluation.SOUMISE) {
            eval.setStatus(StatusEvaluation.EN_VALIDATION);
        }
    }

    private void ensureValidationOwner(Evaluation eval, User admin) {
        claimValidationForAdmin(eval, admin);
    }

    private void clearValidationLock(Evaluation eval) {
        eval.setValidationOpenedBy(null);
        eval.setValidationOpenedAt(null);
    }

    private void releaseExpiredValidationLock(Evaluation eval) {
        if (eval.getValidationOpenedBy() == null || eval.getValidationOpenedAt() == null) {
            return;
        }

        LocalDateTime expiresAt = eval.getValidationOpenedAt().plusMinutes(VALIDATION_LOCK_TIMEOUT_MINUTES);
        if (expiresAt.isAfter(LocalDateTime.now())) {
            return;
        }

        clearValidationLock(eval);
        if (eval.getStatus() == StatusEvaluation.EN_VALIDATION) {
            eval.setStatus(StatusEvaluation.SOUMISE);
        }
    }

    private void initializeCriteres(Principe principe) {
        principe.getBonnesPratiques().forEach(bp -> bp.getCriteres().size());
    }
    
    private void updateRanking(Integer year) {
        List<Evaluation> validated = evaluationRepository.findValidatedByYearOrderByScore(year);
        for (int i = 0; i < validated.size(); i++) {
            Evaluation e = validated.get(i);
            final int rank = i + 1;
            // Update rank in global scores
            globalScoreRepository.findByOrganismeIdAndYear(e.getOrganisme().getId(), year)
                .ifPresent(gs -> {
                    gs.setRank(rank);
                    globalScoreRepository.save(gs);
                });
        }
    }
    
    private EvaluationResponse mapToResponse(Evaluation eval) {
        EvaluationResponse response = new EvaluationResponse();
        response.setId(eval.getId());
        response.setOrganismeId(eval.getOrganisme().getId());
        response.setOrganismeName(eval.getOrganisme().getName());
        response.setOrganismeType(eval.getOrganisme().getType().name());
        response.setYear(eval.getYear());
        response.setStatus(eval.getStatus());
        response.setStartedAt(eval.getStartedAt());
        response.setSubmittedAt(eval.getSubmittedAt());
        response.setValidatedAt(eval.getValidatedAt());
        response.setValidationOpenedAt(eval.getValidationOpenedAt());
        response.setGlobalScore(eval.getGlobalScore());
        response.setMaturityLevel(eval.getMaturityLevel());
        response.setComments(eval.getComments());

        if (eval.getValidationOpenedBy() != null) {
            response.setValidationOpenedById(eval.getValidationOpenedBy().getId());
            response.setValidationOpenedByName(eval.getValidationOpenedBy().getFullName());
        }
        
        // Progress
        long total = reponseRepository.countTotalByEvaluation(eval.getId());
        long answered = reponseRepository.countAnsweredByEvaluation(eval.getId());
        response.setTotalCriteres(total);
        response.setAnsweredCriteres(answered);
        response.setProgressPercentage(total > 0 ? (int) ((answered * 100) / total) : 0);
        
        // Scores
        List<ScorePrincipe> scores = scorePrincipeRepository.findByEvaluationId(eval.getId());
        response.setScores(scores.stream().map(this::mapScoreToResponse).toList());
        
        return response;
    }
    
    private ScorePrincipeResponse mapScoreToResponse(ScorePrincipe sp) {
        ScorePrincipeResponse r = new ScorePrincipeResponse();
        r.setId(sp.getId());
        r.setPrincipeId(sp.getPrincipe().getId());
        r.setPrincipeName(sp.getPrincipe().getNameFr());
        r.setPrincipeNumber(sp.getPrincipe().getNumber());
        r.setScore(sp.getScore());
        r.setMaxPossible(sp.getMaxPossible());
        r.setWeight(sp.getWeight());
        return r;
    }
}
