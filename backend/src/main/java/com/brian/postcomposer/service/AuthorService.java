package com.brian.postcomposer.service;

import com.brian.postcomposer.model.Author;
import com.brian.postcomposer.repository.AuthorRepository;
import org.springframework.stereotype.Service;

@Service
public class AuthorService {
    private final AuthorRepository repository;

    public AuthorService(AuthorRepository repository) { this.repository = repository; }

    /** The existing author with this name, created on first use. Callers hold the transaction. */
    public Author resolve(String name) {
        String trimmed = name.trim();
        return repository.findByName(trimmed).orElseGet(() -> repository.save(new Author(trimmed)));
    }
}
