package com.brian.postcomposer.kafka;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** Idempotency ledger: one row per event that was fully handled. The primary key is what makes a second delivery a no-op. */
@Entity
@Table(name = "processed_events")
public class ProcessedEvent {
    @Id
    @Column(length = 64)
    private String eventId;
    @Column(nullable = false)
    private UUID postId;
    @Column(nullable = false)
    private Instant processedAt;
    /** How many redeliveries were ignored for this event. */
    @Column(nullable = false)
    private int duplicatesSkipped;

    protected ProcessedEvent() {}

    public ProcessedEvent(String eventId, UUID postId) {
        this.eventId = eventId;
        this.postId = postId;
        this.processedAt = Instant.now();
    }

    public String getEventId() { return eventId; }
    public UUID getPostId() { return postId; }
    public Instant getProcessedAt() { return processedAt; }
    public int getDuplicatesSkipped() { return duplicatesSkipped; }
    public void recordDuplicate() { duplicatesSkipped++; }
}
