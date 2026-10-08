package com.brian.postcomposer.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "posts", indexes = {
    // Every list is "filter by status (and platform), order by a timestamp" - these serve that access path.
    @Index(name = "idx_posts_status_updated", columnList = "status, updatedAt"),
    @Index(name = "idx_posts_platform", columnList = "platformId"),
    @Index(name = "idx_posts_scheduled_for", columnList = "scheduledFor"),
    @Index(name = "idx_posts_author", columnList = "author_id")
})
public class Post {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 63206)
    private String content;

    @Column(nullable = false, length = 20)
    private String platformId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostStatus status;

    /** Only set while {@link PostStatus#SCHEDULED}. A UTC instant, like the UI's {@code scheduledFor}. */
    private Instant scheduledFor;

    /** LAZY on purpose: loading a page of posts must not silently load an author per row. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private Author author;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() { createdAt = updatedAt = Instant.now(); }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public UUID getId() { return id; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getPlatformId() { return platformId; }
    public void setPlatformId(String platformId) { this.platformId = platformId; }
    public PostStatus getStatus() { return status; }
    public void setStatus(PostStatus status) { this.status = status; }
    public Instant getScheduledFor() { return scheduledFor; }
    public void setScheduledFor(Instant scheduledFor) { this.scheduledFor = scheduledFor; }
    public Author getAuthor() { return author; }
    public void setAuthor(Author author) { this.author = author; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
