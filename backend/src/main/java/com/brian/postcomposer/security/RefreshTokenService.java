package com.brian.postcomposer.security;

import com.brian.postcomposer.model.RefreshToken;
import com.brian.postcomposer.repository.RefreshTokenRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Experiment 2.3.2: long-lived, opaque, single-use refresh tokens with rotation and reuse detection.
 * <ul>
 *   <li>The raw token is 256 random bits; only its SHA-256 is persisted.</li>
 *   <li>{@link #rotate} burns the presented token and issues a successor in the same family.</li>
 *   <li>Presenting an already-used token means it leaked (or was replayed): the whole family is revoked, so the
 *       thief's newest token dies too and the real user must sign in again.</li>
 * </ul>
 */
@Service
public class RefreshTokenService {
    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);
    private final RefreshTokenRepository repo;
    private final Duration ttl;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository repo, @Value("${app.security.jwt.refresh-ttl}") Duration ttl) {
        this.repo = repo;
        this.ttl = ttl;
    }

    public record Issued(String rawToken, UUID userId) {}

    @Transactional
    public Issued startSession(UUID userId) { return issue(userId, UUID.randomUUID()); }

    /** @throws BadCredentialsException for unknown, expired, revoked or replayed tokens (same message for all). */
    @Transactional(noRollbackFor = BadCredentialsException.class)
    public Issued rotate(String rawToken) {
        RefreshToken current = repo.findByTokenHash(hash(rawToken)).orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));
        if (current.isUsed() || current.isRevoked()) {
            repo.revokeFamily(current.getFamilyId());
            log.warn("Refresh token reuse detected for user {}; revoked its whole token family", current.getUserId());
            throw new BadCredentialsException("Invalid refresh token");
        }
        if (current.getExpiresAt().isBefore(Instant.now())) throw new BadCredentialsException("Refresh token expired");
        current.markUsed();
        return issue(current.getUserId(), current.getFamilyId());
    }

    /** Logout: kill the whole family. Unknown tokens are ignored so logout is idempotent. */
    @Transactional
    public void revoke(String rawToken) {
        repo.findByTokenHash(hash(rawToken)).ifPresent(t -> repo.revokeFamily(t.getFamilyId()));
    }

    public Duration ttl() { return ttl; }

    private Issued issue(UUID userId, UUID familyId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        repo.save(new RefreshToken(userId, familyId, hash(raw), Instant.now().plus(ttl)));
        return new Issued(raw, userId);
    }

    static String hash(String raw) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
