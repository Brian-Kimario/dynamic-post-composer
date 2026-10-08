package com.brian.postcomposer.dto;

import com.brian.postcomposer.model.Post;
import com.brian.postcomposer.model.PostStatus;
import java.time.Instant;
import java.util.UUID;

public record PostResponse(
    UUID id, String content, String platformId, PostStatus status, Instant scheduledFor,
    String authorName, Instant createdAt, Instant updatedAt
) {
    public static PostResponse from(Post p) {
        return new PostResponse(p.getId(), p.getContent(), p.getPlatformId(), p.getStatus(), p.getScheduledFor(),
            p.getAuthorName(), p.getCreatedAt(), p.getUpdatedAt());
    }
}
