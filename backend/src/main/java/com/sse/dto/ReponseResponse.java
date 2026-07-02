package com.sse.dto;

import com.sse.enums.Niveau;
import com.sse.enums.StatusReponse;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class ReponseResponse {
    
    private UUID id;
    private UUID critereId;
    private String critereLabel;
    private Integer critereNumber;
    private UUID bonnePratiqueId;
    private String bonnePratiqueLabel;
    private UUID principeId;
    private String principeName;
    private Niveau niveau;
    private String commentaire;
    private List<String> preuveFiles = new ArrayList<>();
    private List<String> preuveLinks = new ArrayList<>();
    private LocalDateTime submittedAt;
    private StatusReponse status;
    private String validatorComment;
    private String rejectionReason;
    private Boolean correctionAddressed;
    private String preuvesFr;
    private String referencesFr;
}
