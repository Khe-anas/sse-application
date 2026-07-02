package com.sse;

import com.sse.service.PrincipeService;
import com.sse.service.DemoDataService;
import com.sse.service.EvaluationService;
import com.sse.service.DatabaseMigrationService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class SseBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(SseBackendApplication.class, args);
    }

    @Bean
    CommandLineRunner seedData(
            DatabaseMigrationService databaseMigrationService,
            PrincipeService principeService,
            DemoDataService demoDataService,
            EvaluationService evaluationService) {
        return args -> {
            databaseMigrationService.updateNotificationTypeConstraint();
            principeService.seedPrincipes();
            demoDataService.seedDemoData();
            evaluationService.ensureReponsesForExistingEvaluations();
        };
    }
}
