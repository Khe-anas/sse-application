package com.sse.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CritereContenuResponse {

    private UUID id;
    private String texteFr;
    private String texteAr;
    private String texteEn;
    private Integer displayOrder;
}
