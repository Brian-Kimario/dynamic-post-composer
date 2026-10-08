package com.brian.postcomposer.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

/** Body of the calendar's drag-and-drop: only the new instant changes. */
public record RescheduleRequest(
    @NotNull(message = "scheduledFor is required")
    @Future(message = "scheduledFor must be in the future")
    Instant scheduledFor
) {}
