package com.brian.postcomposer.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record ScheduleRequest(
    @NotBlank(message = "Content is required")
    @Size(max = 63206, message = "Content must be at most 63206 characters")
    String content,

    @NotBlank(message = "Platform is required")
    @Pattern(regexp = "facebook|x|linkedin|instagram", message = "Platform must be one of facebook, x, linkedin, instagram")
    String platformId,

    @NotBlank(message = "Author is required")
    @Size(max = 60, message = "Author must be at most 60 characters")
    String authorName,

    @NotNull(message = "scheduledFor is required")
    @Future(message = "scheduledFor must be in the future")
    Instant scheduledFor
) {}
