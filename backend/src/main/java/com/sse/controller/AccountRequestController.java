package com.sse.controller;

import com.sse.dto.AccountRequestResponse;
import com.sse.dto.AccountRequestSubmitRequest;
import com.sse.service.AccountRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/account-requests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AccountRequestController {

    private final AccountRequestService accountRequestService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AccountRequestResponse> submit(@Valid @ModelAttribute AccountRequestSubmitRequest request) {
        return ResponseEntity.ok(accountRequestService.submit(request));
    }
}
