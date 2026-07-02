package com.sse.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GapAnalysisItem {
    
    private UUID principeId;
    private String principeName;
    private Integer principeNumber;
    private Float organismeScore;
    private Float averageScore;
    private Float sectorAverage;
    private Float gap;
    private String recommendation;
}
