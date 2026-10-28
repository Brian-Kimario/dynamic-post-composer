package com.brian.postcomposer.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.brian.postcomposer.crypto.AesGcmEncryptor;
import org.junit.jupiter.api.Test;

class AesGcmEncryptorTest {
    private final AesGcmEncryptor aes = new AesGcmEncryptor("");

    @Test
    void roundTripsAndNeverStoresPlaintext() {
        String stored = aes.encrypt("oauth-token");
        assertThat(stored).doesNotContain("oauth-token");
        assertThat(aes.decrypt(stored)).isEqualTo("oauth-token");
    }

    @Test
    void usesAFreshNonceEveryTime() {
        assertThat(aes.encrypt("same")).isNotEqualTo(aes.encrypt("same"));
    }

    @Test
    void rejectsTamperedCiphertext() {
        char[] chars = aes.encrypt("secret").toCharArray();
        int i = chars.length / 2; // mid-string: the last Base64 chars can be padding bits
        chars[i] = chars[i] == 'A' ? 'B' : 'A';
        assertThatThrownBy(() -> aes.decrypt(new String(chars))).isInstanceOf(IllegalStateException.class);
    }
}
