package com.brian.postcomposer.repository;

import com.brian.postcomposer.model.Author;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorRepository extends JpaRepository<Author, UUID> {
    Optional<Author> findByName(String name);
}
