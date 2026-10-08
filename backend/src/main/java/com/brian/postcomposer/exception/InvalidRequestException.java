package com.brian.postcomposer.exception;

/** The request itself is unacceptable (e.g. an unsortable field). Maps to HTTP 400. */
public class InvalidRequestException extends RuntimeException {
    public InvalidRequestException(String message) { super(message); }
}
