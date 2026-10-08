package com.brian.postcomposer.security;

import com.brian.postcomposer.model.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Issues and verifies short-lived, HS256-signed access tokens. The token is self-contained (subject, role), so the
 * API stays stateless: no session store is consulted on each request. Signature, issuer and expiry are all checked
 * by the parser; anything else (tampered, expired, wrong key, "alg: none") throws a {@link JwtException}.
 */
@Service
public class JwtService {
    private final SecretKey key;
    private final String issuer;
    private final Duration accessTtl;

    public JwtService(@Value("${app.security.jwt.secret}") String base64Secret,
                      @Value("${app.security.jwt.issuer}") String issuer,
                      @Value("${app.security.jwt.access-ttl}") Duration accessTtl) {
        byte[] bytes;
        if (base64Secret == null || base64Secret.isBlank()) {
            bytes = new byte[48];
            new java.security.SecureRandom().nextBytes(bytes);
            org.slf4j.LoggerFactory.getLogger(JwtService.class).warn("JWT_SECRET not set: using a random key; issued tokens will not survive a restart");
        } else {
            bytes = Decoders.BASE64.decode(base64Secret);
        }
        if (bytes.length < 32) throw new IllegalStateException("app.security.jwt.secret must decode to at least 32 bytes");
        this.key = Keys.hmacShaKeyFor(bytes);
        this.issuer = issuer;
        this.accessTtl = accessTtl;
    }

    public String issueAccessToken(AppUserDetails user) {
        Instant now = Instant.now();
        return Jwts.builder()
            .id(UUID.randomUUID().toString())
            .issuer(issuer)
            .subject(user.id().toString())
            .claim("email", user.email())
            .claim("role", user.role().name())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(accessTtl)))
            .signWith(key, Jwts.SIG.HS256)
            .compact();
    }

    /** @throws JwtException if the token is malformed, unsigned, tampered with, expired or from another issuer */
    public AuthenticatedUser verify(String token) {
        Claims c = Jwts.parser().verifyWith(key).requireIssuer(issuer).build().parseSignedClaims(token).getPayload();
        return new AuthenticatedUser(UUID.fromString(c.getSubject()), c.get("email", String.class),
            Role.valueOf(c.get("role", String.class)));
    }

    public Duration accessTtl() { return accessTtl; }
}
