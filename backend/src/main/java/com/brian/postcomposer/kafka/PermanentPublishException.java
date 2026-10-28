package com.brian.postcomposer.kafka;

/** A failure retrying cannot fix (rejected content, revoked token): goes straight to the dead-letter topic. */
public class PermanentPublishException extends RuntimeException {
    public PermanentPublishException(String message) { super(message); }
}
