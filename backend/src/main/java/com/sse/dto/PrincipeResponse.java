package com.sse.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class PrincipeResponse {

    private UUID id;
    private Integer number;
    private String nameFr;
    private String nameAr;
    private String nameEn;
    private String descriptionFr;
    private String descriptionAr;
    private String descriptionEn;
    private Float weight;
    private Boolean isFixed;
    private Boolean isActive;
    private Integer order;
    private LocalDateTime createdAt;
    private List<BonnePratiqueResponse> bonnesPratiques = new ArrayList<>();
}
