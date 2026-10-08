package com.brian.postcomposer.service;

import com.brian.postcomposer.dto.CredentialRequest;
import com.brian.postcomposer.dto.CredentialResponse;
import com.brian.postcomposer.exception.ResourceNotFoundException;
import com.brian.postcomposer.model.OAuthCredential;
import com.brian.postcomposer.repository.OAuthCredentialRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CredentialService {
    private final OAuthCredentialRepository repo;

    public CredentialService(OAuthCredentialRepository repo) { this.repo = repo; }

    @Transactional(readOnly = true)
    public List<CredentialResponse> list(UUID userId) {
        return repo.findByUserIdOrderByProvider(userId).stream().map(CredentialResponse::from).toList();
    }

    /** Upsert: connecting a provider twice replaces the grant. Always scoped to the caller's own user id. */
    @Transactional
    public CredentialResponse save(UUID userId, String provider, CredentialRequest r) {
        OAuthCredential c = repo.findByUserIdAndProvider(userId, provider).orElseGet(() -> new OAuthCredential(userId, provider));
        c.update(r.accessToken(), r.refreshToken(), r.expiresAt(), r.scopes());
        return CredentialResponse.from(repo.save(c));
    }

    @Transactional
    public void delete(UUID userId, String provider) {
        if (repo.deleteByUserIdAndProvider(userId, provider) == 0) throw new ResourceNotFoundException("OAuth credential", provider);
    }
}
