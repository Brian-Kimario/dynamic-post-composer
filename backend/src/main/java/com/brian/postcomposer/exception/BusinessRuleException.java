package com.brian.postcomposer.exception;

/** A well-formed request that breaks a domain rule (e.g. content over the platform limit). Maps to HTTP 422. */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) { super(message); }
}
