package com.brian.postcomposer.kafka;

/** In-process signal raised inside the scheduling transaction; the broker is only touched after it commits. */
public record PostScheduledCreated(PostScheduledEvent event) {}
