package com.sse.service;

import com.sse.dto.ReponseBatchRequest;
import com.sse.dto.ReponseResponse;
import com.sse.entity.Critere;
import com.sse.entity.Evaluation;
import com.sse.entity.Reponse;
import com.sse.entity.User;
import com.sse.enums.StatusEvaluation;
import com.sse.enums.StatusReponse;
import com.sse.exception.ResourceLockedException;
import com.sse.repository.CritereRepository;
import com.sse.repository.EvaluationRepository;
import com.sse.repository.ReponseRepository;
import com.sse.repository.UserRepository;
import com.sse.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReponseService {

    private static final long VALIDATION_LOCK_TIMEOUT_MINUTES = 10;
    
    private final ReponseRepository reponseRepository;
    private final EvaluationRepository evaluationRepository;
    private final CritereRepository critereRepository;
    private final FileStorageService fileStorageService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final CurrentUserService currentUserService;
    
    public List<ReponseResponse> getReponsesByEvaluationAndPrincipe(UUID evaluationId, UUID principeId) {
        List<Reponse> reponses = reponseRepository.findByEvaluationAndPrincipe(evaluationId, principeId);
        return reponses.stream().map(this::mapToResponse).toList();
    }
    
    public List<ReponseResponse> getReponsesByEvaluation(UUID evaluationId) {
        List<Reponse> reponses = reponseRepository.findByEvaluationId(evaluationId);
        return reponses.stream().map(this::mapToResponse).toList();
    }
    
    @Transactional
    public List<ReponseResponse> saveReponses(UUID evaluationId, ReponseBatchRequest request) {
        Evaluation eval = evaluationRepository.findById(evaluationId)
            .orElseThrow(() -> new RuntimeException("Evaluation not found"));
        
        if (eval.getStatus() != StatusEvaluation.EN_COURS) {
            throw new RuntimeException("Evaluation must be EN_COURS to save reponses");
        }
        
        List<Reponse> existingReponses = reponseRepository.findByEvaluationId(evaluationId);

        for (ReponseBatchRequest.ReponseItem item : request.getReponses()) {
            Reponse reponse = existingReponses.stream()
                .filter(r -> r.getCritere().getId().equals(item.getCritereId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Reponse not found for critere " + item.getCritereId()));

            assertReponseCanBeEdited(reponse);
            
            reponse.setNiveau(item.getNiveau());
            reponse.setCommentaire(item.getCommentaire());
            if (item.getPreuveLinks() != null) {
                reponse.setPreuveLinks(item.getPreuveLinks());
            }
            if (reponse.getStatus() == StatusReponse.A_CORRIGER && Boolean.TRUE.equals(item.getCorrectionAddressed())) {
                reponse.setCorrectionAddressed(true);
            }
            reponseRepository.save(reponse);
        }
        
        return getReponsesByEvaluation(evaluationId);
    }
    
    @Transactional
    public ReponseResponse updateReponse(UUID reponseId, String commentaire, String niveauOrdinal) {
        Reponse reponse = reponseRepository.findById(reponseId)
            .orElseThrow(() -> new RuntimeException("Reponse not found"));
        
        assertReponseCanBeEdited(reponse);
        
        if (commentaire != null) reponse.setCommentaire(commentaire);
        reponseRepository.save(reponse);
        
        return mapToResponse(reponse);
    }
    
    @Transactional
    public ReponseResponse validateReponse(UUID reponseId, String comment) {
        Reponse reponse = reponseRepository.findById(reponseId)
            .orElseThrow(() -> new RuntimeException("Reponse not found"));
        ensureValidationOwner(reponse.getEvaluation());
        
        reponse.setStatus(StatusReponse.VALIDEE);
        reponse.setValidatedAt(LocalDateTime.now());
        reponse.setValidatorComment(comment);
        reponse.setRejectionReason(null);
        reponse.setCorrectionAddressed(false);
        
        return mapToResponse(reponseRepository.save(reponse));
    }
    
    @Transactional
    public ReponseResponse rejectReponse(UUID reponseId, String reason) {
        Reponse reponse = reponseRepository.findById(reponseId)
            .orElseThrow(() -> new RuntimeException("Reponse not found"));
        ensureValidationOwner(reponse.getEvaluation());
        
        reponse.setStatus(StatusReponse.REJETEE);
        reponse.setRejectionReason(reason);
        reponse.setValidatorComment(null);
        reponse.setValidatedAt(null);
        reponse.setCorrectionAddressed(false);
        
        return mapToResponse(reponseRepository.save(reponse));
    }
    
    @Transactional
    public ReponseResponse requestCorrectionReponse(UUID reponseId, String reason) {
        Reponse reponse = reponseRepository.findById(reponseId)
            .orElseThrow(() -> new RuntimeException("Reponse not found"));
        Evaluation evaluation = reponse.getEvaluation();
        ensureValidationOwner(evaluation);
        String correctionReason = reason != null && !reason.isBlank() ? reason : "Correction demandée";
        
        evaluation.setStatus(StatusEvaluation.EN_COURS);
        clearValidationLock(evaluation);
        evaluationRepository.save(evaluation);

        reponse.setStatus(StatusReponse.A_CORRIGER);
        reponse.setValidatorComment(correctionReason);
        reponse.setRejectionReason(null);
        reponse.setValidatedAt(null);
        reponse.setCorrectionAddressed(false);
        Reponse saved = reponseRepository.save(reponse);

        List<User> responsables = userRepository.findActiveResponsablesByOrganisme(evaluation.getOrganisme().getId());
        for (User responsable : responsables) {
            notificationService.sendCorrectionRequested(
                responsable.getId(),
                evaluation.getOrganisme().getName(),
                correctionReason,
                evaluation.getId(),
                reponse.getCritere().getLabelFr()
            );
        }
        
        return mapToResponse(saved);
    }
    
    @Transactional
    public String uploadProof(UUID reponseId, MultipartFile file) {
        Reponse reponse = reponseRepository.findById(reponseId)
            .orElseThrow(() -> new RuntimeException("Reponse not found"));

        assertReponseCanBeEdited(reponse);
        
        String fileUrl = fileStorageService.store(file);
        reponse.getPreuveFiles().add(fileUrl);
        markCorrectionAddressed(reponse);
        reponseRepository.save(reponse);
        
        return fileUrl;
    }
    
    @Transactional
    public void deleteProof(UUID reponseId, String fileUrl) {
        Reponse reponse = reponseRepository.findById(reponseId)
            .orElseThrow(() -> new RuntimeException("Reponse not found"));

        assertReponseCanBeEdited(reponse);
        
        reponse.getPreuveFiles().remove(fileUrl);
        fileStorageService.delete(fileUrl);
        markCorrectionAddressed(reponse);
        reponseRepository.save(reponse);
    }
    
    private ReponseResponse mapToResponse(Reponse r) {
        ReponseResponse response = new ReponseResponse();
        response.setId(r.getId());
        response.setCritereId(r.getCritere().getId());
        response.setCritereLabel(r.getCritere().getLabelFr());
        response.setCritereNumber(r.getCritere().getNumber());
        response.setBonnePratiqueId(r.getCritere().getBonnePratique().getId());
        response.setBonnePratiqueLabel(r.getCritere().getBonnePratique().getLabelFr());
        response.setPrincipeId(r.getCritere().getBonnePratique().getPrincipe().getId());
        response.setPrincipeName(r.getCritere().getBonnePratique().getPrincipe().getNameFr());
        response.setNiveau(r.getNiveau());
        response.setCommentaire(r.getCommentaire());
        response.setPreuveFiles(r.getPreuveFiles());
        response.setPreuveLinks(r.getPreuveLinks());
        response.setSubmittedAt(r.getSubmittedAt());
        response.setStatus(r.getStatus());
        response.setValidatorComment(r.getValidatorComment());
        response.setRejectionReason(r.getRejectionReason());
        response.setCorrectionAddressed(Boolean.TRUE.equals(r.getCorrectionAddressed()));
        response.setPreuvesFr(r.getCritere().getPreuvesFr());
        response.setReferencesFr(r.getCritere().getReferencesFr());
        return response;
    }

    private void markCorrectionAddressed(Reponse reponse) {
        if (reponse.getStatus() == StatusReponse.A_CORRIGER) {
            reponse.setCorrectionAddressed(true);
        }
    }

    private void assertReponseCanBeEdited(Reponse reponse) {
        if (reponse.getEvaluation().getStatus() != StatusEvaluation.EN_COURS
            || (reponse.getStatus() != StatusReponse.BROUILLON && reponse.getStatus() != StatusReponse.A_CORRIGER)) {
            throw new RuntimeException("Only draft responses or responses requested for correction can be updated");
        }
    }

    private void ensureValidationOwner(Evaluation evaluation) {
        releaseExpiredValidationLock(evaluation);

        if (evaluation.getStatus() != StatusEvaluation.SOUMISE && evaluation.getStatus() != StatusEvaluation.EN_VALIDATION) {
            throw new RuntimeException("Evaluation must be SOUMISE or EN_VALIDATION to review responses");
        }

        User admin = currentUserService.getCurrentUser();
        User openedBy = evaluation.getValidationOpenedBy();

        if (openedBy == null) {
            evaluation.setValidationOpenedBy(admin);
            evaluation.setValidationOpenedAt(LocalDateTime.now());
            evaluation.setStatus(StatusEvaluation.EN_VALIDATION);
            evaluationRepository.save(evaluation);
            return;
        }

        if (!openedBy.getId().equals(admin.getId())) {
            throw new ResourceLockedException("Cette validation est deja ouverte par " + openedBy.getFullName());
        }

        evaluation.setValidationOpenedAt(LocalDateTime.now());
        if (evaluation.getStatus() == StatusEvaluation.SOUMISE) {
            evaluation.setStatus(StatusEvaluation.EN_VALIDATION);
        }
        evaluationRepository.save(evaluation);
    }

    private void clearValidationLock(Evaluation evaluation) {
        evaluation.setValidationOpenedBy(null);
        evaluation.setValidationOpenedAt(null);
    }

    private void releaseExpiredValidationLock(Evaluation evaluation) {
        if (evaluation.getValidationOpenedBy() == null || evaluation.getValidationOpenedAt() == null) {
            return;
        }

        LocalDateTime expiresAt = evaluation.getValidationOpenedAt().plusMinutes(VALIDATION_LOCK_TIMEOUT_MINUTES);
        if (expiresAt.isAfter(LocalDateTime.now())) {
            return;
        }

        clearValidationLock(evaluation);
        if (evaluation.getStatus() == StatusEvaluation.EN_VALIDATION) {
            evaluation.setStatus(StatusEvaluation.SOUMISE);
        }
        evaluationRepository.save(evaluation);
    }
}
