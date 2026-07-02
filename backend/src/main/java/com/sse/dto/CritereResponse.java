package com.sse.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class CritereResponse {

    private UUID id;
    private Integer number;
    private String labelFr;
    private String labelAr;
    private String labelEn;
    private String preuvesFr;
    private String preuvesAr;
    private String preuvesEn;
    private String referencesFr;
    private String referencesAr;
    private String referencesEn;
    private UUID bonnePratiqueId;
}
