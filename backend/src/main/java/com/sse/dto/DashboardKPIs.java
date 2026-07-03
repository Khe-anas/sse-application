package com.sse.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardKPIs {
    
    private Long totalOrganismes;
    private Long totalUsers;
    private Long evaluationsEnCours;
    private Long evaluationsValidees;
    private Long evaluationsSoumises;
    private Double averageScore;
    private Long pendingValidations;
    private java.util.List<DashboardDistributionItem> organismesByType;
    private java.util.List<DashboardDistributionItem> evaluationsByStatus;
}
