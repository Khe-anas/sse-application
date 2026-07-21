package com.sse.controller;

import com.sse.dto.ChatRequest;
import com.sse.dto.ChatResponse;
import com.sse.service.ChatbotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/chatbot")
@RequiredArgsConstructor
public class ChatbotController {
    
    private final ChatbotService chatbotService;
    
    @PostMapping("/message")
    public ResponseEntity<ChatResponse> processMessage(@RequestBody ChatRequest request) {
        return ResponseEntity.ok(chatbotService.processMessage(request));
    }
}
