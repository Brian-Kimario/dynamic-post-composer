package com.brian.postcomposer.kafka;

import java.time.Instant;
import java.util.UUID;

/** Published when a post is scheduled. {@code eventId} is the idempotency key: a redelivered event carries the same one. */
public record PostScheduledEvent(String eventId, UUID postId, String platformId, String content, Instant scheduledFor) {
    public static PostScheduledEvent of(UUID postId, String platformId, String content, Instant scheduledFor) {
        return new PostScheduledEvent(UUID.randomUUID().toString(), postId, platformId, content, scheduledFor);
    }
}
