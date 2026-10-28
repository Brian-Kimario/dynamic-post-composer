package com.brian.postcomposer.kafka;

/** A failure worth retrying (platform API timeout, rate limit). */
public class TransientPublishException extends RuntimeException {
    public TransientPublishException(String message) { super(message); }
}
