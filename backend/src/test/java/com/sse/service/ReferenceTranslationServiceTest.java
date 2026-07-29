package com.sse.service;

import com.sse.dto.ReferenceTranslationResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ReferenceTranslationServiceTest {

    @Test
    void startsWithTheProductionSpringConstructor() {
        new ApplicationContextRunner()
            .withUserConfiguration(ReferenceTranslationService.class)
            .run(context -> {
                assertNull(context.getStartupFailure());
                assertNotNull(context.getBean(ReferenceTranslationService.class));
            });
    }

    @Test
    void fallsBackAfterPrimaryProviderRateLimit() {
        RestClient.Builder primaryBuilder = RestClient.builder().baseUrl("https://primary.example");
        MockRestServiceServer primaryServer = MockRestServiceServer.bindTo(primaryBuilder).build();
        RestClient.Builder fallbackBuilder = RestClient.builder().baseUrl("https://fallback.example");
        MockRestServiceServer fallbackServer = MockRestServiceServer.bindTo(fallbackBuilder).build();

        primaryServer.expect(requestTo(containsString("/get")))
            .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
        fallbackServer.expect(requestTo(containsString("tl=en")))
            .andRespond(withSuccess(
                "[[[\"Clear governance\",\"Gouvernance claire\",null,null,3]],null,\"fr\"]",
                MediaType.APPLICATION_JSON
            ));
        fallbackServer.expect(requestTo(containsString("tl=ar")))
            .andRespond(withSuccess(
                "[[[\"حوكمة واضحة\",\"Gouvernance claire\",null,null,3]],null,\"fr\"]",
                MediaType.APPLICATION_JSON
            ));

        ReferenceTranslationService service = new ReferenceTranslationService(
            primaryBuilder.build(),
            fallbackBuilder.build(),
            true,
            true,
            ""
        );

        ReferenceTranslationResponse response = service.translateFields(
            Map.of("labelFr", "Gouvernance claire")
        );

        assertEquals("Clear governance", response.fields().get("labelFr").en());
        assertEquals("حوكمة واضحة", response.fields().get("labelFr").ar());
        primaryServer.verify();
        fallbackServer.verify();
    }
}
