package com.brian.postcomposer.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Experiment 3.3.2 - Swagger UI at /swagger-ui.html; "Authorize" accepts the access token from POST /auth/login. */
@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI postComposerOpenApi() {
        return new OpenAPI()
                .info(new Info().title("Dynamic Post Composer API").version("v1")
                        .description("Posts, scheduling, analytics and auth. Roles: ADMIN, EDITOR, VIEWER."))
                .components(new Components().addSecuritySchemes("bearerAuth",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
