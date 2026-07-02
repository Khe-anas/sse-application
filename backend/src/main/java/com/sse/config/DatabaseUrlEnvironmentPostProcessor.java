package com.sse.config;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "renderDatabaseUrl";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (hasEnv("SPRING_DATASOURCE_URL")) {
            return;
        }

        String databaseUrl = System.getenv("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isBlank()) {
            return;
        }

        Map<String, Object> properties = parseDatabaseUrl(databaseUrl.trim());
        if (!properties.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, properties));
        }
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }

    private static Map<String, Object> parseDatabaseUrl(String databaseUrl) {
        Map<String, Object> properties = new HashMap<>();

        if (databaseUrl.startsWith("jdbc:postgresql://")) {
            properties.put("spring.datasource.url", databaseUrl);
            return properties;
        }

        if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
            return properties;
        }

        URI uri = URI.create(databaseUrl);
        String host = uri.getHost();
        String database = uri.getPath() == null ? "" : uri.getPath().replaceFirst("^/", "");
        if (host == null || database.isBlank()) {
            return Map.of();
        }

        int port = uri.getPort() == -1 ? 5432 : uri.getPort();
        String query = uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery();
        properties.put("spring.datasource.url", "jdbc:postgresql://" + host + ":" + port + "/" + database + query);

        String userInfo = uri.getUserInfo();
        if (userInfo != null) {
            String[] credentials = userInfo.split(":", 2);
            if (credentials.length > 0 && !credentials[0].isBlank() && !hasEnv("SPRING_DATASOURCE_USERNAME")) {
                properties.put("spring.datasource.username", credentials[0]);
            }
            if (credentials.length > 1 && !credentials[1].isBlank() && !hasEnv("SPRING_DATASOURCE_PASSWORD")) {
                properties.put("spring.datasource.password", credentials[1]);
            }
        }

        return properties;
    }

    private static boolean hasEnv(String name) {
        String value = System.getenv(name);
        return value != null && !value.isBlank();
    }
}
