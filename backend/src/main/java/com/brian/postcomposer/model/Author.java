package com.brian.postcomposer.model;

import jakarta.persistence.*;
import java.util.UUID;

/** Who wrote a post. Posts reference it lazily, which is what makes the N+1 problem possible (and fixable). */
@Entity
@Table(name = "authors", uniqueConstraints = @UniqueConstraint(name = "uk_authors_name", columnNames = "name"))
public class Author {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 60)
    private String name;

    protected Author() {}

    public Author(String name) { this.name = name; }

    public UUID getId() { return id; }
    public String getName() { return name; }
}
