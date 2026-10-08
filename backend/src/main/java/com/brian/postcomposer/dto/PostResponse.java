package com.brian.postcomposer.dto;

import com.brian.postcomposer.model.Post;
import com.brian.postcomposer.model.PostStatus;
import java.time.Instant;
import java.util.UUID;

/** Built inside the service transaction so the lazy author is resolved there; cached values are these records, never entities. */
public record PostResponse(
    UUID id, String content, String platformId, PostStatus status, Instant scheduledFor,
    String authorName, Instant createdAt, Instant updatedAt
) {
    public static PostResponse from(Post p) {
        return new PostResponse(p.getId(), p.getContent(), p.getPlatformId(), p.getStatus(), p.getScheduledFor(),
            p.getAuthor().getName(), p.getCreatedAt(), p.getUpdatedAt());
    }
}
