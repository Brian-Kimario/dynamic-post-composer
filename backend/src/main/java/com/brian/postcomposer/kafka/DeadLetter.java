package com.brian.postcomposer.kafka;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** An event that exhausted its retries (or failed permanently), kept for inspection and manual replay. */
@Entity
@Table(name = "dead_letters")
public class DeadLetter {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, unique = true, length = 64)
    private String eventId;
    private UUID postId;
    @Column(length = 500)
    private String payload;
    @Column(length = 200)
    private String errorClass;
    @Column(length = 1000)
    private String errorMessage;
    @Column(nullable = false)
    private Instant failedAt;

    protected DeadLetter() {}

    public DeadLetter(String eventId, UUID postId, String payload, String errorClass, String errorMessage) {
        this.eventId = eventId;
        this.postId = postId;
        this.payload = abbreviate(payload, 500);
        this.errorClass = abbreviate(errorClass, 200);
        this.errorMessage = abbreviate(errorMessage, 1000);
        this.failedAt = Instant.now();
    }

    private static String abbreviate(String s, int max) { return s == null || s.length() <= max ? s : s.substring(0, max); }

    public UUID getId() { return id; }
    public String getEventId() { return eventId; }
    public UUID getPostId() { return postId; }
    public String getPayload() { return payload; }
    public String getErrorClass() { return errorClass; }
    public String getErrorMessage() { return errorMessage; }
    public Instant getFailedAt() { return failedAt; }
}
