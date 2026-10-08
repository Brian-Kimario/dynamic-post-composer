package com.brian.postcomposer.model;

import com.brian.postcomposer.crypto.EncryptedStringConverter;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** A user's third-party (X, LinkedIn, ...) OAuth grant. The tokens are ciphertext in the database. */
@Entity
@Table(name = "oauth_credentials",
    uniqueConstraints = @UniqueConstraint(name = "uk_oauth_user_provider", columnNames = {"userId", "provider"}))
public class OAuthCredential {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 40)
    private String provider;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(nullable = false, length = 2048)
    private String accessToken;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(length = 2048)
    private String refreshToken;

    private Instant expiresAt;

    @Column(length = 255)
    private String scopes;

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    protected OAuthCredential() {}

    public OAuthCredential(UUID userId, String provider) {
        this.userId = userId;
        this.provider = provider;
    }

    public void update(String accessToken, String refreshToken, Instant expiresAt, String scopes) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresAt = expiresAt;
        this.scopes = scopes;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getProvider() { return provider; }
    public String getAccessToken() { return accessToken; }
    public String getRefreshToken() { return refreshToken; }
    public Instant getExpiresAt() { return expiresAt; }
    public String getScopes() { return scopes; }
    public Instant getUpdatedAt() { return updatedAt; }
}
