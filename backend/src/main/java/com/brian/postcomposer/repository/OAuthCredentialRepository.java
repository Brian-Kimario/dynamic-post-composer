package com.brian.postcomposer.repository;

import com.brian.postcomposer.model.OAuthCredential;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthCredentialRepository extends JpaRepository<OAuthCredential, UUID> {
    List<OAuthCredential> findByUserIdOrderByProvider(UUID userId);
    Optional<OAuthCredential> findByUserIdAndProvider(UUID userId, String provider);
    long deleteByUserIdAndProvider(UUID userId, String provider);
}
