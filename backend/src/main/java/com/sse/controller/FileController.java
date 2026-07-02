package com.sse.controller;

import com.sse.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;

@RestController
@RequestMapping("/uploads")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FileController {
    
    private final FileStorageService fileStorageService;
    
    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String filename) {
        try {
            Path filePath = fileStorageService.getFilePath(filename);
            Resource resource = new UrlResource(filePath.toUri());
            
            if (resource.exists()) {
                MediaType mediaType = filename.toLowerCase().endsWith(".pdf")
                    ? MediaType.APPLICATION_PDF
                    : MediaType.APPLICATION_OCTET_STREAM;
                return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .header("X-Content-Type-Options", "nosniff")
                    .header("Content-Security-Policy", "sandbox")
                    .header(HttpHeaders.CACHE_CONTROL, "no-store")
                    .body(resource);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
