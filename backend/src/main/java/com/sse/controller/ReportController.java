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
import com.sse.dto.ScorePrincipeResponse;
import com.sse.service.EvaluationService;
import com.sse.service.ReponseService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.PrintSetup;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.DefaultIndexedColorMap;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
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
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + buildExcelFilename(evaluation))
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

    byte[] buildExcelReport(EvaluationResponse evaluation, List<ReponseResponse> reponses) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Map<String, CellStyle> styles = createExcelStyles(workbook);
            buildExcelSummarySheet(workbook, evaluation, reponses, styles);
            buildExcelDetailsSheet(workbook, reponses, styles);

            workbook.setActiveSheet(0);
            workbook.setSelectedTab(0);
            workbook.getProperties().getCoreProperties().setTitle("Rapport d'evaluation SSE");
            workbook.getProperties().getCoreProperties().setSubjectProperty(
                evaluation.getOrganismeName() + " - " + evaluation.getYear()
            );
            workbook.getProperties().getCoreProperties().setCreator("SSE - CNI");

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new RuntimeException("Unable to generate Excel report", ex);
        }
    }

    private void buildExcelSummarySheet(
        XSSFWorkbook workbook,
        EvaluationResponse evaluation,
        List<ReponseResponse> reponses,
        Map<String, CellStyle> styles
    ) {
        Sheet sheet = workbook.createSheet("Synthese");
        sheet.setDisplayGridlines(false);
        sheet.setAutobreaks(true);
        sheet.setFitToPage(true);
        sheet.setMargin(Sheet.LeftMargin, 0.35);
        sheet.setMargin(Sheet.RightMargin, 0.35);
        sheet.setMargin(Sheet.TopMargin, 0.45);
        sheet.setMargin(Sheet.BottomMargin, 0.45);

        PrintSetup printSetup = sheet.getPrintSetup();
        printSetup.setPaperSize(PrintSetup.A4_PAPERSIZE);
        printSetup.setFitWidth((short) 1);
        printSetup.setFitHeight((short) 1);

        int[] widths = { 16, 32, 16, 22, 16, 22 };
        for (int i = 0; i < widths.length; i++) {
            sheet.setColumnWidth(i, widths[i] * 256);
        }

        Row titleRow = sheet.createRow(0);
        titleRow.setHeightInPoints(34);
        sheet.addMergedRegion(new CellRangeAddress(0, 1, 0, 5));
        writeCell(titleRow, 0, "RAPPORT D'EVALUATION SSE", styles.get("title"));

        Row subtitleRow = sheet.createRow(2);
        subtitleRow.setHeightInPoints(24);
        sheet.addMergedRegion(new CellRangeAddress(2, 2, 0, 5));
        writeCell(
            subtitleRow,
            0,
            "Synthese officielle de l'evaluation de la bonne gouvernance",
            styles.get("subtitle")
        );

        Row overviewHeader = sheet.createRow(4);
        overviewHeader.setHeightInPoints(24);
        sheet.addMergedRegion(new CellRangeAddress(4, 4, 0, 5));
        writeCell(overviewHeader, 0, "VUE D'ENSEMBLE", styles.get("section"));

        Row organisationRow = sheet.createRow(5);
        organisationRow.setHeightInPoints(28);
        writeCell(organisationRow, 0, "Organisme", styles.get("label"));
        sheet.addMergedRegion(new CellRangeAddress(5, 5, 1, 5));
        writeCell(organisationRow, 1, evaluation.getOrganismeName(), styles.get("valueStrong"));

        Row infoRow = sheet.createRow(6);
        infoRow.setHeightInPoints(26);
        writeLabelValuePair(infoRow, 0, "Annee", evaluation.getYear(), styles);
        writeLabelValuePair(infoRow, 2, "Statut", formatEvaluationStatus(evaluation.getStatus()), styles);
        writeCell(infoRow, 4, "Progression", styles.get("label"));
        writePercentCell(infoRow, 5, evaluation.getProgressPercentage(), styles.get("score"));

        Row scoreRow = sheet.createRow(7);
        scoreRow.setHeightInPoints(26);
        writeCell(scoreRow, 0, "Score global", styles.get("label"));
        writePercentCell(scoreRow, 1, evaluation.getGlobalScore(), styles.get("score"));
        writeLabelValuePair(scoreRow, 2, "Maturite", formatMaturity(evaluation.getMaturityLevel()), styles);
        writeLabelValuePair(scoreRow, 4, "Criteres", reponses.size(), styles);

        Row dateRow = sheet.createRow(8);
        dateRow.setHeightInPoints(24);
        writeCell(dateRow, 0, "Genere le", styles.get("label"));
        sheet.addMergedRegion(new CellRangeAddress(8, 8, 1, 5));
        writeCell(
            dateRow,
            1,
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy 'a' HH:mm")),
            styles.get("value")
        );

        Row scoresHeader = sheet.createRow(10);
        scoresHeader.setHeightInPoints(24);
        sheet.addMergedRegion(new CellRangeAddress(10, 10, 0, 5));
        writeCell(scoresHeader, 0, "SCORES PAR PRINCIPE", styles.get("section"));

        Row tableHeader = sheet.createRow(11);
        tableHeader.setHeightInPoints(26);
        String[] scoreHeaders = { "N°", "Principe", "Score", "Maximum", "Poids", "Niveau" };
        for (int i = 0; i < scoreHeaders.length; i++) {
            writeCell(tableHeader, i, scoreHeaders[i], styles.get("header"));
        }

        List<ScorePrincipeResponse> principleScores = new ArrayList<>(evaluation.getScores());
        principleScores.sort(Comparator.comparing(
            ScorePrincipeResponse::getPrincipeNumber,
            Comparator.nullsLast(Integer::compareTo)
        ));

        int rowIndex = 12;
        if (principleScores.isEmpty()) {
            Row emptyRow = sheet.createRow(rowIndex);
            emptyRow.setHeightInPoints(28);
            sheet.addMergedRegion(new CellRangeAddress(rowIndex, rowIndex, 0, 5));
            writeCell(emptyRow, 0, "Les scores seront disponibles apres validation.", styles.get("empty"));
        } else {
            for (ScorePrincipeResponse score : principleScores) {
                Row row = sheet.createRow(rowIndex++);
                row.setHeightInPoints(28);
                CellStyle bodyStyle = rowIndex % 2 == 0 ? styles.get("bodyAlt") : styles.get("body");
                writeCell(row, 0, score.getPrincipeNumber(), bodyStyle);
                writeCell(row, 1, score.getPrincipeName(), bodyStyle);
                writePercentCell(row, 2, score.getScore(), styles.get("score"));
                writeNumericCell(row, 3, score.getMaxPossible(), styles.get("number"));
                writeNumericCell(row, 4, score.getWeight(), styles.get("number"));
                writeCell(row, 5, formatMaturityForScore(score.getScore()), maturityStyle(score.getScore(), styles));
            }
        }

        sheet.createFreezePane(0, 4);
        sheet.setRepeatingRows(new CellRangeAddress(0, 3, -1, -1));
        workbook.setPrintArea(workbook.getSheetIndex(sheet), 0, 5, 0, Math.max(rowIndex, 12));
    }

    private void buildExcelDetailsSheet(
        XSSFWorkbook workbook,
        List<ReponseResponse> reponses,
        Map<String, CellStyle> styles
    ) {
        Sheet sheet = workbook.createSheet("Detail des reponses");
        sheet.setDisplayGridlines(false);
        sheet.setAutobreaks(true);
        sheet.setFitToPage(true);
        sheet.setMargin(Sheet.LeftMargin, 0.25);
        sheet.setMargin(Sheet.RightMargin, 0.25);
        sheet.setMargin(Sheet.TopMargin, 0.4);
        sheet.setMargin(Sheet.BottomMargin, 0.4);

        PrintSetup printSetup = sheet.getPrintSetup();
        printSetup.setLandscape(true);
        printSetup.setPaperSize(PrintSetup.A4_PAPERSIZE);
        printSetup.setFitWidth((short) 1);
        printSetup.setFitHeight((short) 0);

        String[] headers = {
            "Principe", "Bonne pratique", "Critere", "Niveau", "Decision",
            "Commentaire responsable", "Commentaire evaluateur", "Motif de rejet", "Fichiers", "Liens"
        };
        int[] widths = { 28, 34, 58, 16, 18, 38, 38, 36, 32, 40 };

        Row header = sheet.createRow(0);
        header.setHeightInPoints(34);
        for (int i = 0; i < headers.length; i++) {
            writeCell(header, i, headers[i], styles.get("header"));
            sheet.setColumnWidth(i, widths[i] * 256);
        }

        int rowIndex = 1;
        for (ReponseResponse reponse : reponses) {
            Row row = sheet.createRow(rowIndex);
            row.setHeightInPoints(54);
            CellStyle bodyStyle = rowIndex % 2 == 0 ? styles.get("bodyAlt") : styles.get("body");

            writeCell(row, 0, formatNullable(reponse.getPrincipeName()), bodyStyle);
            writeCell(row, 1, formatNullable(reponse.getBonnePratiqueLabel()), bodyStyle);
            writeCell(
                row,
                2,
                formatNullable(reponse.getCritereNumber()) + ". " + formatNullable(reponse.getCritereLabel()),
                bodyStyle
            );
            writeCell(row, 3, formatNiveauLabel(reponse.getNiveau()), niveauStyle(reponse.getNiveau(), styles));
            writeCell(row, 4, formatReponseStatus(reponse.getStatus()), responseStatusStyle(reponse.getStatus(), styles));
            writeCell(row, 5, formatNullable(reponse.getCommentaire()), bodyStyle);
            writeCell(row, 6, formatNullable(reponse.getValidatorComment()), bodyStyle);
            writeCell(row, 7, formatNullable(reponse.getRejectionReason()), bodyStyle);
            writeCell(row, 8, joinLines(reponse.getPreuveFiles()), bodyStyle);
            writeCell(row, 9, joinLines(reponse.getPreuveLinks()), bodyStyle);
            rowIndex++;
        }

        sheet.createFreezePane(0, 1);
        sheet.setAutoFilter(new CellRangeAddress(0, Math.max(0, rowIndex - 1), 0, headers.length - 1));
        sheet.setRepeatingRows(new CellRangeAddress(0, 0, -1, -1));
        workbook.setPrintArea(workbook.getSheetIndex(sheet), 0, headers.length - 1, 0, Math.max(1, rowIndex - 1));
    }

    private Map<String, CellStyle> createExcelStyles(XSSFWorkbook workbook) {
        Map<String, CellStyle> styles = new LinkedHashMap<>();
        styles.put("title", createExcelStyle(workbook, "183B4E", "FFFFFF", 20, true, HorizontalAlignment.LEFT, VerticalAlignment.CENTER, false, false));
        styles.put("subtitle", createExcelStyle(workbook, "183B4E", "DCE8E3", 10, false, HorizontalAlignment.LEFT, VerticalAlignment.CENTER, false, false));
        styles.put("section", createExcelStyle(workbook, "315C58", "FFFFFF", 11, true, HorizontalAlignment.LEFT, VerticalAlignment.CENTER, false, false));
        styles.put("label", createExcelStyle(workbook, "E8EFEC", "315C58", 10, true, HorizontalAlignment.LEFT, VerticalAlignment.CENTER, true, true));
        styles.put("value", createExcelStyle(workbook, "FFFFFF", "24332E", 10, false, HorizontalAlignment.LEFT, VerticalAlignment.CENTER, true, true));
        styles.put("valueStrong", createExcelStyle(workbook, "FFFFFF", "183B4E", 11, true, HorizontalAlignment.LEFT, VerticalAlignment.CENTER, true, true));
        styles.put("header", createExcelStyle(workbook, "244F5A", "FFFFFF", 10, true, HorizontalAlignment.CENTER, VerticalAlignment.CENTER, true, true));
        styles.put("body", createExcelStyle(workbook, "FFFFFF", "27342F", 9, false, HorizontalAlignment.LEFT, VerticalAlignment.TOP, true, true));
        styles.put("bodyAlt", createExcelStyle(workbook, "F4F7F6", "27342F", 9, false, HorizontalAlignment.LEFT, VerticalAlignment.TOP, true, true));
        styles.put("empty", createExcelStyle(workbook, "F4F7F6", "68756F", 10, false, HorizontalAlignment.CENTER, VerticalAlignment.CENTER, true, true));
        styles.put("n0", createExcelStyle(workbook, "F8E5E2", "8C3D36", 9, true, HorizontalAlignment.CENTER, VerticalAlignment.CENTER, true, true));
        styles.put("n1", createExcelStyle(workbook, "F7EDCF", "795E21", 9, true, HorizontalAlignment.CENTER, VerticalAlignment.CENTER, true, true));
        styles.put("n2", createExcelStyle(workbook, "E2EEF2", "315E6D", 9, true, HorizontalAlignment.CENTER, VerticalAlignment.CENTER, true, true));
        styles.put("n3", createExcelStyle(workbook, "E1EFE7", "356A4C", 9, true, HorizontalAlignment.CENTER, VerticalAlignment.CENTER, true, true));
        styles.put("neutral", createExcelStyle(workbook, "EEF1F0", "596660", 9, true, HorizontalAlignment.CENTER, VerticalAlignment.CENTER, true, true));

        CellStyle scoreStyle = workbook.createCellStyle();
        scoreStyle.cloneStyleFrom(styles.get("body"));
        scoreStyle.setAlignment(HorizontalAlignment.CENTER);
        scoreStyle.setDataFormat(workbook.createDataFormat().getFormat("0.0%"));
        styles.put("score", scoreStyle);

        CellStyle numberStyle = workbook.createCellStyle();
        numberStyle.cloneStyleFrom(styles.get("body"));
        numberStyle.setAlignment(HorizontalAlignment.CENTER);
        numberStyle.setDataFormat(workbook.createDataFormat().getFormat("0.0"));
        styles.put("number", numberStyle);
        return styles;
    }

    private CellStyle createExcelStyle(
        XSSFWorkbook workbook,
        String fillHex,
        String fontHex,
        int fontSize,
        boolean bold,
        HorizontalAlignment horizontalAlignment,
        VerticalAlignment verticalAlignment,
        boolean wrapText,
        boolean borders
    ) {
        XSSFCellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(excelColor(fillHex));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(horizontalAlignment);
        style.setVerticalAlignment(verticalAlignment);
        style.setWrapText(wrapText);

        XSSFFont font = workbook.createFont();
        font.setFontName("Aptos");
        font.setFontHeightInPoints((short) fontSize);
        font.setBold(bold);
        font.setColor(excelColor(fontHex));
        style.setFont(font);

        if (borders) {
            style.setBorderTop(BorderStyle.THIN);
            style.setBorderRight(BorderStyle.THIN);
            style.setBorderBottom(BorderStyle.THIN);
            style.setBorderLeft(BorderStyle.THIN);
            short borderColor = IndexedColors.GREY_25_PERCENT.getIndex();
            style.setTopBorderColor(borderColor);
            style.setRightBorderColor(borderColor);
            style.setBottomBorderColor(borderColor);
            style.setLeftBorderColor(borderColor);
        }
        return style;
    }

    private XSSFColor excelColor(String hex) {
        return new XSSFColor(Color.decode("#" + hex), new DefaultIndexedColorMap());
    }

    private void writeLabelValuePair(Row row, int startColumn, String label, Object value, Map<String, CellStyle> styles) {
        writeCell(row, startColumn, label, styles.get("label"));
        writeCell(row, startColumn + 1, value, styles.get("value"));
    }

    private void writeCell(Row row, int column, Object value, CellStyle style) {
        Cell cell = row.createCell(column);
        if (value instanceof Number number) {
            cell.setCellValue(number.doubleValue());
        } else {
            cell.setCellValue(formatNullable(value));
        }
        cell.setCellStyle(style);
    }

    private void writeNumericCell(Row row, int column, Number value, CellStyle style) {
        Cell cell = row.createCell(column);
        if (value != null) {
            cell.setCellValue(value.doubleValue());
        } else {
            cell.setCellValue("-");
        }
        cell.setCellStyle(style);
    }

    private void writePercentCell(Row row, int column, Number value, CellStyle style) {
        Cell cell = row.createCell(column);
        if (value != null) {
            cell.setCellValue(value.doubleValue() / 100d);
        } else {
            cell.setCellValue("-");
        }
        cell.setCellStyle(style);
    }

    private CellStyle niveauStyle(Object niveau, Map<String, CellStyle> styles) {
        if (niveau == null) return styles.get("neutral");
        return switch (niveau.toString()) {
            case "N0" -> styles.get("n0");
            case "N1" -> styles.get("n1");
            case "N2" -> styles.get("n2");
            case "N3" -> styles.get("n3");
            default -> styles.get("neutral");
        };
    }

    private CellStyle responseStatusStyle(Object status, Map<String, CellStyle> styles) {
        if (status == null) return styles.get("neutral");
        return switch (status.toString()) {
            case "VALIDEE" -> styles.get("n3");
            case "REJETEE" -> styles.get("n0");
            case "A_CORRIGER" -> styles.get("n1");
            case "SOUMISE" -> styles.get("n2");
            default -> styles.get("neutral");
        };
    }

    private CellStyle maturityStyle(Float score, Map<String, CellStyle> styles) {
        if (score == null) return styles.get("neutral");
        if (score < 25) return styles.get("n0");
        if (score < 50) return styles.get("n1");
        if (score < 75) return styles.get("n2");
        return styles.get("n3");
    }

    private String formatMaturityForScore(Float score) {
        if (score == null) return "-";
        if (score < 25) return "Initial";
        if (score < 50) return "En progression";
        if (score < 75) return "Avance";
        return "Excellent";
    }

    private String joinLines(List<String> values) {
        return values == null || values.isEmpty() ? "-" : String.join("\n", values);
    }

    private String buildExcelFilename(EvaluationResponse evaluation) {
        String organisation = formatNullable(evaluation.getOrganismeName())
            .toLowerCase()
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-|-$)", "");
        if (organisation.isBlank()) {
            organisation = "organisme";
        }
        return "evaluation-" + organisation + "-" + evaluation.getYear() + ".xlsx";
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
