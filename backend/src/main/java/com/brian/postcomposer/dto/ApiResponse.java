package com.brian.postcomposer.dto;

import com.brian.postcomposer.logging.CorrelationId;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

/**
 * The single envelope every endpoint returns, success or failure. {@code correlationId} ties a response to the
 * log lines written while serving it (Experiment 2.1.2).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(String status, boolean success, String message, T data, String correlationId, Instant timestamp) {
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>("success", true, message, data, CorrelationId.current(), Instant.now());
    }

    public static <T> ApiResponse<T> failure(String message, T data) {
        return new ApiResponse<>("error", false, message, data, CorrelationId.current(), Instant.now());
    }
}
