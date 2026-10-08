package com.brian.postcomposer.model;

/** Lifecycle of a post. The UI's three collections (drafts, schedule, published) map onto these. */
public enum PostStatus {
    DRAFT,
    SCHEDULED,
    PUBLISHED
}
