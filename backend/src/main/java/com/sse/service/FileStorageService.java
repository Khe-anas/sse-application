package com.sse.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    private static final Set<String> PDF_CONTENT_TYPES = Set.of(
        "application/pdf",
        "application/x-pdf",
        "application/octet-stream"
    );

    private static final String[] DANGEROUS_PDF_NAMES = {
        "/JavaScript",
        "/JS",
        "/OpenAction",
        "/AA",
        "/Launch",
        "/EmbeddedFile",
        "/RichMedia",
        "/XFA",
        "/Encrypt"
    };

    @Value("${upload.dir:uploads}")
    private String uploadDir;

    @Value("${upload.max-file-size:10485760}")
    private long maxFileSize;

    private Path uploadPath;

    @PostConstruct
    public void init() {
        uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadPath);
            log.info("File storage initialized at: {}", uploadPath);
        } catch (IOException ex) {
            throw new RuntimeException("Could not create upload directory: " + uploadPath, ex);
        }
    }

    public String store(MultipartFile file) {
        return store(file, null);
    }

    public String storePdf(MultipartFile file) {
        validatePdf(file);
        return store(file, ".pdf");
    }

    private String store(MultipartFile file, String extensionOverride) {
        if (file.getSize() > maxFileSize) {
            throw new RuntimeException("File size exceeds maximum allowed size of " + (maxFileSize / 1024 / 1024) + "MB");
        }

        try {
            String extension = extractSafeExtension(file.getOriginalFilename());
            if (extensionOverride != null) {
                extension = extensionOverride;
            }

            String filename = UUID.randomUUID().toString() + extension;
            Path targetPath = uploadPath.resolve(filename).normalize();

            if (!targetPath.startsWith(uploadPath)) {
                throw new RuntimeException("Invalid file path");
            }

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

            log.info("File stored locally: {}", filename);
            return "/uploads/" + filename;

        } catch (IOException ex) {
            throw new RuntimeException("Could not store file", ex);
        }
    }

    private void validatePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Le fichier PDF est vide");
        }
        if (file.getSize() > maxFileSize) {
            throw new RuntimeException("Le fichier PDF dépasse la taille maximale autorisée");
        }

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
        if (!originalFilename.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new RuntimeException("Seuls les fichiers PDF sont autorisés");
        }

        String contentType = file.getContentType();
        if (contentType != null && !PDF_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new RuntimeException("Le type du fichier doit être PDF");
        }

        try {
            byte[] content = file.getBytes();
            if (content.length < 5 || content[0] != '%' || content[1] != 'P' || content[2] != 'D' || content[3] != 'F' || content[4] != '-') {
                throw new RuntimeException("Le fichier n'est pas un PDF valide");
            }

            String pdfText = new String(content, StandardCharsets.ISO_8859_1);
            for (String token : DANGEROUS_PDF_NAMES) {
                if (containsPdfName(pdfText, token)) {
                    throw new RuntimeException("PDF refusé: contenu actif ou pièce embarquée détecté");
                }
            }
        } catch (IOException ex) {
            throw new RuntimeException("Impossible de lire le fichier PDF", ex);
        }
    }

    private boolean containsPdfName(String pdfText, String token) {
        int index = pdfText.indexOf(token);
        while (index >= 0) {
            int nextIndex = index + token.length();
            if (nextIndex >= pdfText.length() || isPdfDelimiter(pdfText.charAt(nextIndex))) {
                return true;
            }
            index = pdfText.indexOf(token, index + token.length());
        }
        return false;
    }

    private boolean isPdfDelimiter(char value) {
        return Character.isWhitespace(value)
            || value == '('
            || value == ')'
            || value == '<'
            || value == '>'
            || value == '['
            || value == ']'
            || value == '{'
            || value == '}'
            || value == '/'
            || value == '%';
    }

    private String extractSafeExtension(String originalFilename) {
        if (originalFilename == null || !originalFilename.contains(".")) {
            return "";
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase(Locale.ROOT);
        return extension.matches("\\.[a-z0-9]{1,10}") ? extension : "";
    }

    public void delete(String fileUrl) {
        try {
            String filename = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
            Path targetPath = uploadPath.resolve(filename).normalize();

            if (!targetPath.startsWith(uploadPath)) {
                log.warn("Invalid file path for deletion: {}", fileUrl);
                return;
            }

            Files.deleteIfExists(targetPath);
            log.info("File deleted: {}", filename);
        } catch (Exception ex) {
            log.error("Could not delete file: {}", fileUrl, ex);
        }
    }

    public byte[] getFileContent(String filename) {
        try {
            Path targetPath = uploadPath.resolve(filename).normalize();

            if (!targetPath.startsWith(uploadPath)) {
                throw new RuntimeException("Invalid file path");
            }

            return Files.readAllBytes(targetPath);
        } catch (IOException ex) {
            throw new RuntimeException("Could not read file: " + filename, ex);
        }
    }
}
