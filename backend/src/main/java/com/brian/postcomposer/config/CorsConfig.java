package com.brian.postcomposer.config;

import com.brian.postcomposer.logging.CorrelationId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Only the configured frontend origins may call /api/**. The correlation header is both accepted (the UI may send
 * its own id) and exposed (browsers hide non-safelisted response headers from scripts unless told otherwise).
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    private final String[] allowedOrigins;

    public CorsConfig(@Value("${app.cors.allowed-origins}") String[] allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins(allowedOrigins)
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("Content-Type", "Authorization", CorrelationId.HEADER)
            .exposedHeaders(CorrelationId.HEADER)
            .maxAge(3600);
    }
}
