package com.brian.postcomposer.dto;

import com.brian.postcomposer.model.OAuthCredential;
import java.time.Instant;

/** Deliberately has no token fields: secrets go in, they never come back out over the API. */
public record CredentialResponse(String provider, boolean hasRefreshToken, Instant expiresAt, String scopes, Instant updatedAt) {
    public static CredentialResponse from(OAuthCredential c) {
        return new CredentialResponse(c.getProvider(), c.getRefreshToken() != null, c.getExpiresAt(), c.getScopes(), c.getUpdatedAt());
    }
}
