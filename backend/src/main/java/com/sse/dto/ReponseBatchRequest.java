package com.sse.dto;

import com.sse.enums.Niveau;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ReponseBatchRequest {
    
    private List<ReponseItem> reponses;
    
    @Data
    public static class ReponseItem {
        private UUID critereId;
        private Niveau niveau;
        private String commentaire;
        private List<String> preuveLinks;
        private Boolean correctionAddressed;
    }
}
