package com.brian.postcomposer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record CredentialRequest(
    @NotBlank @Size(max = 2048) String accessToken,
    @Size(max = 2048) String refreshToken,
    Instant expiresAt,
    @Size(max = 255) String scopes) {}
