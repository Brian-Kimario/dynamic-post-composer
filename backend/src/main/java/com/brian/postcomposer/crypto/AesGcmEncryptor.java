package com.brian.postcomposer.crypto;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * AES-256-GCM for data at rest. The lab sheet's example uses plain {@code Cipher.getInstance("AES")}, which is
 * AES/ECB: identical plaintexts give identical ciphertexts and nothing detects tampering. GCM fixes both: a fresh
 * random 96-bit IV per value (so the same token encrypts differently every time) and a 128-bit auth tag (so a
 * modified ciphertext fails to decrypt instead of yielding garbage). Stored format: Base64( IV || ciphertext+tag ).
 */
@Component
public class AesGcmEncryptor {
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private final SecretKey key;
    private final SecureRandom random = new SecureRandom();

    public AesGcmEncryptor(@Value("${app.security.encryption-key}") String base64Key) {
        byte[] bytes;
        if (base64Key == null || base64Key.isBlank()) {
            bytes = new byte[32];
            random.nextBytes(bytes);
            org.slf4j.LoggerFactory.getLogger(AesGcmEncryptor.class).warn("ENCRYPTION_KEY not set: using a random key; stored credentials will be unreadable after a restart");
        } else {
            bytes = Base64.getDecoder().decode(base64Key);
        }
        if (bytes.length != 32) throw new IllegalStateException("app.security.encryption-key must decode to exactly 32 bytes (AES-256)");
        this.key = new SecretKeySpec(bytes, "AES");
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ct = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(iv.length + ct.length).put(iv).put(ct).array());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    /** @throws IllegalStateException if the value was tampered with or encrypted under a different key */
    public String decrypt(String stored) {
        try {
            byte[] all = Base64.getDecoder().decode(stored);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, all, 0, IV_BYTES));
            return new String(cipher.doFinal(all, IV_BYTES, all.length - IV_BYTES), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("Decryption failed (tampered data or wrong key)", e);
        }
    }
}
