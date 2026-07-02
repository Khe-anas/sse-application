package com.sse.dto;

import com.sse.enums.MaturityLevel;
import com.sse.enums.StatusEvaluation;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class EvaluationResponse {
    
    private UUID id;
    private UUID organismeId;
    private String organismeName;
    private String organismeType;
    private Integer year;
    private StatusEvaluation status;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private LocalDateTime validatedAt;
    private UUID validationOpenedById;
    private String validationOpenedByName;
    private LocalDateTime validationOpenedAt;
    private Float globalScore;
    private MaturityLevel maturityLevel;
    private String comments;
    private Long totalCriteres;
    private Long answeredCriteres;
    private Integer progressPercentage;
    private List<ScorePrincipeResponse> scores = new ArrayList<>();
}
