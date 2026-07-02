package com.sse.dto;

import com.sse.enums.MaturityLevel;
import com.sse.enums.TypeOrganisme;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RankingItem {
    
    private Integer rank;
    private UUID organismeId;
    private String organismeName;
    private TypeOrganisme type;
    private Float score;
    private MaturityLevel maturityLevel;
    private Integer year;
    private String trend; // UP, DOWN, STABLE
}
