package com.sse.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ScorePrincipeResponse {
    
    private UUID id;
    private UUID principeId;
    private String principeName;
    private Integer principeNumber;
    private Float score;
    private Float maxPossible;
    private Float weight;
}
