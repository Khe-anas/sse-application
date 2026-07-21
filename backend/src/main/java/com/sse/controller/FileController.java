package com.sse.controller;

import com.sse.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/uploads")
@RequiredArgsConstructor
public class FileController {
    
    private final FileStorageService fileStorageService;
    
    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String filename) {
        try {
            byte[] fileBytes = fileStorageService.getFileContent(filename);
            Resource resource = new ByteArrayResource(fileBytes);

            MediaType mediaType = getMediaType(filename);
            boolean image = mediaType.getType().equals("image");

            return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, (image ? "inline" : "attachment") + "; filename=\"" + filename + "\"")
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "sandbox")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    private MediaType getMediaType(String filename) {
        String lowerName = filename.toLowerCase();
        if (lowerName.endsWith(".pdf")) return MediaType.APPLICATION_PDF;
        if (lowerName.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return MediaType.IMAGE_JPEG;
        if (lowerName.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
