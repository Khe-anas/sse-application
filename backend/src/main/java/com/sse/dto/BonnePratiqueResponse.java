package com.sse.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class BonnePratiqueResponse {

    private UUID id;
    private Integer number;
    private String labelFr;
    private String labelAr;
    private String labelEn;
    private UUID principeId;
    private List<CritereResponse> criteres = new ArrayList<>();
}
