package com.brian.postcomposer.crypto;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.stereotype.Component;

/** JPA hook: fields annotated {@code @Convert(converter = EncryptedStringConverter.class)} are encrypted on write, decrypted on read. */
@Component
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {
    private final AesGcmEncryptor encryptor;

    public EncryptedStringConverter(AesGcmEncryptor encryptor) { this.encryptor = encryptor; }

    @Override public String convertToDatabaseColumn(String plain) { return plain == null ? null : encryptor.encrypt(plain); }
    @Override public String convertToEntityAttribute(String stored) { return stored == null ? null : encryptor.decrypt(stored); }
}
