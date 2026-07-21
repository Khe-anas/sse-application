package com.sse.controller;

import com.sse.dto.EvaluationResponse;
import com.sse.dto.ReponseResponse;
import com.sse.dto.ScorePrincipeResponse;
import com.sse.enums.MaturityLevel;
import com.sse.enums.Niveau;
import com.sse.enums.StatusEvaluation;
import com.sse.enums.StatusReponse;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReportControllerTest {

    @Test
    void excelReportContainsProfessionalSummaryAndFilterableDetails() throws Exception {
        ReportController controller = new ReportController(null, null);
        EvaluationResponse evaluation = buildEvaluation();
        List<ReponseResponse> responses = List.of(
            buildResponse("Transparence", "Publication des informations", "Publier le rapport annuel", Niveau.N3, StatusReponse.VALIDEE),
            buildResponse("Responsabilite", "Mecanismes de controle", "Documenter le plan de controle", Niveau.N1, StatusReponse.A_CORRIGER)
        );

        byte[] report = controller.buildExcelReport(evaluation, responses);
        String sampleOutput = System.getProperty("sse.report.sampleOutput");
        if (sampleOutput != null && !sampleOutput.isBlank()) {
            Path outputPath = Path.of(sampleOutput);
            Files.createDirectories(outputPath.getParent());
            Files.write(outputPath, report);
        }

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(report))) {
            assertEquals(2, workbook.getNumberOfSheets());
            assertEquals("Synthese", workbook.getSheetAt(0).getSheetName());
            assertEquals("Detail des reponses", workbook.getSheetAt(1).getSheetName());
            assertEquals("RAPPORT D'EVALUATION SSE", workbook.getSheetAt(0).getRow(0).getCell(0).getStringCellValue());
            assertEquals(0.72d, workbook.getSheetAt(0).getRow(7).getCell(1).getNumericCellValue(), 0.0001d);
            assertEquals("0.0%", workbook.getSheetAt(0).getRow(7).getCell(1).getCellStyle().getDataFormatString());
            assertNotNull(workbook.getSheetAt(0).getPaneInformation());
            assertNotNull(workbook.getSheetAt(1).getPaneInformation());
            assertTrue(workbook.getSheetAt(1).getCTWorksheet().isSetAutoFilter());
            assertTrue(workbook.getSheetAt(1).getColumnWidth(2) > workbook.getSheetAt(1).getColumnWidth(3));
        }
    }

    private EvaluationResponse buildEvaluation() {
        EvaluationResponse evaluation = new EvaluationResponse();
        evaluation.setOrganismeName("Entreprise de demonstration");
        evaluation.setYear(2026);
        evaluation.setStatus(StatusEvaluation.VALIDEE);
        evaluation.setGlobalScore(72f);
        evaluation.setMaturityLevel(MaturityLevel.AVANCE);
        evaluation.setProgressPercentage(100);

        ScorePrincipeResponse score = new ScorePrincipeResponse();
        score.setPrincipeNumber(1);
        score.setPrincipeName("Transparence");
        score.setScore(72f);
        score.setMaxPossible(100f);
        score.setWeight(1f);
        evaluation.setScores(List.of(score));
        return evaluation;
    }

    private ReponseResponse buildResponse(
        String principle,
        String practice,
        String criterion,
        Niveau level,
        StatusReponse status
    ) {
        ReponseResponse response = new ReponseResponse();
        response.setPrincipeName(principle);
        response.setBonnePratiqueLabel(practice);
        response.setCritereNumber(1);
        response.setCritereLabel(criterion);
        response.setNiveau(level);
        response.setStatus(status);
        response.setCommentaire("Commentaire de demonstration");
        response.setPreuveLinks(List.of("https://example.com/preuve"));
        return response;
    }
}
