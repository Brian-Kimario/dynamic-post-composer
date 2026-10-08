package com.brian.postcomposer.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Server-side record of an issued refresh token. Only the SHA-256 of the token is stored, so a database leak does
 * not leak usable sessions. Every token belongs to a {@code familyId} (one login); rotating makes a new token in
 * the same family and marks the old one used.
 */
@Entity
@Table(name = "refresh_tokens",
    indexes = {@Index(name = "idx_refresh_family", columnList = "familyId"),
               @Index(name = "idx_refresh_hash", columnList = "tokenHash", unique = true)})
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private UUID familyId;

    @Column(nullable = false, length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean used;

    @Column(nullable = false)
    private boolean revoked;

    protected RefreshToken() {}

    public RefreshToken(UUID userId, UUID familyId, String tokenHash, Instant expiresAt) {
        this.userId = userId;
        this.familyId = familyId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    public UUID getUserId() { return userId; }
    public UUID getFamilyId() { return familyId; }
    public Instant getExpiresAt() { return expiresAt; }
    public boolean isUsed() { return used; }
    public boolean isRevoked() { return revoked; }
    public void markUsed() { this.used = true; }
}
