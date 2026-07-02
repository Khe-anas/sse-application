package com.sse.controller;

import com.lowagie.text.Element;
import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.sse.dto.EvaluationResponse;
import com.sse.dto.ReponseResponse;
import com.sse.service.EvaluationService;
import com.sse.service.ReponseService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReportController {
    
    private final EvaluationService evaluationService;
    private final ReponseService reponseService;
    
    @GetMapping("/{evaluationId}/pdf")
    @PreAuthorize("@accessControl.canReadEvaluation(#p0)")
    public ResponseEntity<byte[]> generateEvaluationPdf(@PathVariable UUID evaluationId) {
        EvaluationResponse evaluation = evaluationService.getEvaluationById(evaluationId);
        List<ReponseResponse> reponses = reponseService.getReponsesByEvaluation(evaluationId);
        byte[] report = buildPdfReport(evaluation, reponses);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=evaluation-" + evaluationId + ".pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(report);
    }
    
    @GetMapping("/{evaluationId}/excel")
    @PreAuthorize("@accessControl.canReadEvaluation(#p0)")
    public ResponseEntity<byte[]> generateEvaluationExcel(@PathVariable UUID evaluationId) {
        EvaluationResponse evaluation = evaluationService.getEvaluationById(evaluationId);
        List<ReponseResponse> reponses = reponseService.getReponsesByEvaluation(evaluationId);
        byte[] report = buildExcelReport(evaluation, reponses);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=evaluation-" + evaluationId + ".xlsx")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(report);
    }
    
    @GetMapping("/global/excel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> generateGlobalExcel(@RequestParam(required = false) Integer year) {
        // TODO: Implement global Excel export
        String placeholder = "Global Excel report will be generated here for year: " + year;
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=global-report.xlsx")
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .body(placeholder.getBytes());
    }

    private byte[] buildPdfReport(EvaluationResponse evaluation, List<ReponseResponse> reponses) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 28, 28, 28, 28);
            PdfWriter.getInstance(document, out);
            document.addTitle("Rapport d'evaluation SSE");
            document.addSubject("Evaluation " + evaluation.getYear() + " - " + evaluation.getOrganismeName());
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, new Color(17, 24, 39));
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(75, 85, 99));
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, new Color(75, 85, 99));
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new Color(17, 24, 39));
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.WHITE);
            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, Color.WHITE);
            Font tableBodyFont = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(31, 41, 55));
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, new Color(75, 85, 99));

            document.add(buildReportHeader(evaluation, titleFont, subtitleFont));
            document.add(buildSummaryTable(evaluation, reponses.size(), labelFont, valueFont));
            document.add(spacer(8));

            Map<String, List<ReponseResponse>> reponsesByPrincipe = groupByPrincipe(reponses);
            for (Map.Entry<String, List<ReponseResponse>> entry : reponsesByPrincipe.entrySet()) {
                document.add(buildSectionHeader(entry.getKey(), sectionFont));
                document.add(buildCriteriaTable(entry.getValue(), tableHeaderFont, tableBodyFont, smallFont));
                document.add(spacer(6));
            }

            document.close();
            return out.toByteArray();
        } catch (Exception ex) {
            throw new RuntimeException("Unable to generate PDF report", ex);
        }
    }

    private byte[] buildExcelReport(EvaluationResponse evaluation, List<ReponseResponse> reponses) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet summary = workbook.createSheet("Evaluation");
            int summaryRow = 0;
            writeKeyValue(summary, summaryRow++, "Organisme", evaluation.getOrganismeName());
            writeKeyValue(summary, summaryRow++, "Annee", evaluation.getYear());
            writeKeyValue(summary, summaryRow++, "Statut", evaluation.getStatus());
            writeKeyValue(summary, summaryRow++, "Score", formatScore(evaluation.getGlobalScore()));
            writeKeyValue(summary, summaryRow++, "Maturite", formatNullable(evaluation.getMaturityLevel()));

            Sheet details = workbook.createSheet("Reponses");
            Row header = details.createRow(0);
            String[] headers = {
                "Principe", "Bonne pratique", "Critere", "Etat", "Statut",
                "Commentaire", "Commentaire admin", "Motif rejet", "Fichiers", "Liens"
            };
            for (int i = 0; i < headers.length; i++) {
                header.createCell(i).setCellValue(headers[i]);
            }

            int rowIndex = 1;
            for (ReponseResponse reponse : reponses) {
                Row row = details.createRow(rowIndex++);
                row.createCell(0).setCellValue(formatNullable(reponse.getPrincipeName()));
                row.createCell(1).setCellValue(formatNullable(reponse.getBonnePratiqueLabel()));
                row.createCell(2).setCellValue(formatNullable(reponse.getCritereLabel()));
                row.createCell(3).setCellValue(formatNiveauLabel(reponse.getNiveau()));
                row.createCell(4).setCellValue(formatNullable(reponse.getStatus()));
                row.createCell(5).setCellValue(formatNullable(reponse.getCommentaire()));
                row.createCell(6).setCellValue(formatNullable(reponse.getValidatorComment()));
                row.createCell(7).setCellValue(formatNullable(reponse.getRejectionReason()));
                row.createCell(8).setCellValue(String.join(", ", reponse.getPreuveFiles()));
                row.createCell(9).setCellValue(String.join(", ", reponse.getPreuveLinks()));
            }

            for (int i = 0; i < headers.length; i++) {
                details.setColumnWidth(i, 24 * 256);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new RuntimeException("Unable to generate Excel report", ex);
        }
    }

    private PdfPTable buildReportHeader(EvaluationResponse evaluation, Font titleFont, Font subtitleFont) throws Exception {
        PdfPTable header = new PdfPTable(new float[] { 3.5f, 1.2f });
        header.setWidthPercentage(100);
        header.setSpacingAfter(12);

        PdfPCell titleCell = new PdfPCell();
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleCell.setPadding(0);
        titleCell.addElement(new Paragraph("Rapport d'\u00E9valuation SSE", titleFont));
        titleCell.addElement(new Paragraph(
            "Synth\u00E8se et d\u00E9tail des crit\u00E8res soumis par l'organisation",
            subtitleFont
        ));
        header.addCell(titleCell);

        PdfPCell badgeCell = new PdfPCell(new Phrase("Document officiel", FontFactory.getFont(
            FontFactory.HELVETICA_BOLD,
            9,
            new Color(30, 64, 175)
        )));
        badgeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        badgeCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        badgeCell.setBorder(Rectangle.NO_BORDER);
        badgeCell.setPadding(10);
        badgeCell.setBackgroundColor(new Color(219, 234, 254));
        header.addCell(badgeCell);

        return header;
    }

    private PdfPTable buildSummaryTable(EvaluationResponse evaluation, int reponseCount, Font labelFont, Font valueFont) throws Exception {
        PdfPTable summary = new PdfPTable(new float[] { 1f, 1.4f, 1f, 1.2f, 1f, 1.2f });
        summary.setWidthPercentage(100);
        summary.setSpacingAfter(8);

        addSummaryCell(summary, "Organisme", evaluation.getOrganismeName(), labelFont, valueFont);
        addSummaryCell(summary, "Ann\u00E9e", evaluation.getYear(), labelFont, valueFont);
        addSummaryCell(summary, "Statut", formatEvaluationStatus(evaluation.getStatus()), labelFont, valueFont);
        addSummaryCell(summary, "Score global", formatScore(evaluation.getGlobalScore()), labelFont, valueFont);
        addSummaryCell(summary, "Maturit\u00E9", formatMaturity(evaluation.getMaturityLevel()), labelFont, valueFont);
        addSummaryCell(summary, "Crit\u00E8res", reponseCount, labelFont, valueFont);

        return summary;
    }

    private PdfPTable buildSectionHeader(String principeName, Font sectionFont) {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        table.setSpacingBefore(6);
        table.setSpacingAfter(0);

        PdfPCell cell = new PdfPCell(new Phrase(principeName, sectionFont));
        cell.setPadding(8);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setBackgroundColor(new Color(30, 64, 175));
        table.addCell(cell);
        return table;
    }

    private PdfPTable buildCriteriaTable(
        List<ReponseResponse> reponses,
        Font tableHeaderFont,
        Font tableBodyFont,
        Font smallFont
    ) throws Exception {
        PdfPTable table = new PdfPTable(new float[] { 2.7f, 2.3f, 1.1f, 1.15f, 2.4f, 2.1f });
        table.setWidthPercentage(100);
        table.setHeaderRows(1);

        addTableHeader(table, "Crit\u00E8re", tableHeaderFont);
        addTableHeader(table, "Bonne pratique", tableHeaderFont);
        addTableHeader(table, "\u00C9tat", tableHeaderFont);
        addTableHeader(table, "D\u00E9cision", tableHeaderFont);
        addTableHeader(table, "Commentaires", tableHeaderFont);
        addTableHeader(table, "Preuves", tableHeaderFont);

        int rowIndex = 0;
        for (ReponseResponse reponse : reponses) {
            Color background = rowIndex % 2 == 0 ? Color.WHITE : new Color(249, 250, 251);
            addTableCell(table, formatNullable(reponse.getCritereNumber()) + ". " + formatNullable(reponse.getCritereLabel()), tableBodyFont, background);
            addTableCell(table, formatNullable(reponse.getBonnePratiqueLabel()), tableBodyFont, background);
            addTableCell(table, formatNiveauLabel(reponse.getNiveau()), tableBodyFont, background);
            addTableCell(table, formatReponseStatus(reponse.getStatus()), tableBodyFont, background);
            addTableCell(table, buildCommentText(reponse), smallFont, background);
            addTableCell(table, buildProofText(reponse), smallFont, background);
            rowIndex++;
        }

        return table;
    }

    private void addSummaryCell(PdfPTable table, String label, Object value, Font labelFont, Font valueFont) {
        PdfPCell cell = new PdfPCell();
        cell.setPadding(8);
        cell.setBorderColor(new Color(229, 231, 235));
        cell.setBackgroundColor(new Color(248, 250, 252));
        cell.addElement(new Paragraph(label, labelFont));
        cell.addElement(new Paragraph(formatNullable(value), valueFont));
        table.addCell(cell);
    }

    private void addTableHeader(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(6);
        cell.setBorderColor(new Color(30, 64, 175));
        cell.setBackgroundColor(new Color(37, 99, 235));
        table.addCell(cell);
    }

    private void addTableCell(PdfPTable table, String text, Font font, Color background) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(6);
        cell.setBorderColor(new Color(229, 231, 235));
        cell.setBackgroundColor(background);
        cell.setVerticalAlignment(Element.ALIGN_TOP);
        table.addCell(cell);
    }

    private Paragraph spacer(float height) {
        Paragraph paragraph = new Paragraph(" ");
        paragraph.setSpacingAfter(height);
        return paragraph;
    }

    private Map<String, List<ReponseResponse>> groupByPrincipe(List<ReponseResponse> reponses) {
        Map<String, List<ReponseResponse>> grouped = new LinkedHashMap<>();
        for (ReponseResponse reponse : reponses) {
            grouped
                .computeIfAbsent(formatNullable(reponse.getPrincipeName()), key -> new ArrayList<>())
                .add(reponse);
        }
        return grouped;
    }

    private String buildCommentText(ReponseResponse reponse) {
        List<String> comments = new ArrayList<>();
        if (hasText(reponse.getCommentaire())) {
            comments.add("Responsable: " + reponse.getCommentaire());
        }
        if (hasText(reponse.getValidatorComment())) {
            comments.add("Admin: " + reponse.getValidatorComment());
        }
        if (hasText(reponse.getRejectionReason())) {
            comments.add("Rejet: " + reponse.getRejectionReason());
        }
        return comments.isEmpty() ? "-" : String.join("\n", comments);
    }

    private String buildProofText(ReponseResponse reponse) {
        List<String> proofs = new ArrayList<>();
        if (reponse.getPreuveFiles() != null && !reponse.getPreuveFiles().isEmpty()) {
            proofs.add("Fichiers: " + String.join(", ", reponse.getPreuveFiles()));
        }
        if (reponse.getPreuveLinks() != null && !reponse.getPreuveLinks().isEmpty()) {
            proofs.add("Liens: " + String.join(", ", reponse.getPreuveLinks()));
        }
        return proofs.isEmpty() ? "-" : String.join("\n", proofs);
    }

    private String formatNiveauLabel(Object niveau) {
        if (niveau == null) {
            return "-";
        }

        return switch (niveau.toString()) {
            case "N0" -> "N'existe pas";
            case "N1" -> "En cours";
            case "N2" -> "R\u00E9alis\u00E9";
            case "N3" -> "Valid\u00E9";
            default -> niveau.toString();
        };
    }

    private String formatEvaluationStatus(Object status) {
        if (status == null) {
            return "-";
        }

        return switch (status.toString()) {
            case "EN_COURS" -> "En cours";
            case "SOUMISE" -> "Soumise";
            case "EN_VALIDATION" -> "En validation";
            case "VALIDEE" -> "Valid\u00E9e";
            case "REJETEE" -> "Rejet\u00E9e";
            default -> status.toString();
        };
    }

    private String formatReponseStatus(Object status) {
        if (status == null) {
            return "-";
        }

        return switch (status.toString()) {
            case "BROUILLON" -> "Brouillon";
            case "SOUMISE" -> "Soumise";
            case "VALIDEE" -> "Valid\u00E9e";
            case "REJETEE" -> "Rejet\u00E9e";
            case "A_CORRIGER" -> "\u00C0 corriger";
            default -> status.toString();
        };
    }

    private String formatMaturity(Object maturity) {
        if (maturity == null) {
            return "-";
        }

        return switch (maturity.toString()) {
            case "INITIAL" -> "Initial";
            case "EN_PROGRESSION" -> "En progression";
            case "AVANCE" -> "Avanc\u00E9";
            case "EXCELLENT" -> "Excellent";
            default -> maturity.toString();
        };
    }

    private void writeKeyValue(Sheet sheet, int rowIndex, String key, Object value) {
        Row row = sheet.createRow(rowIndex);
        row.createCell(0).setCellValue(key);
        row.createCell(1).setCellValue(formatNullable(value));
    }

    private String formatScore(Float score) {
        return score != null ? String.format("%.1f%%", score) : "-";
    }

    private String formatNullable(Object value) {
        return value != null ? value.toString() : "-";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
