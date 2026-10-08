package com.brian.postcomposer.dto;

import com.brian.postcomposer.model.PostStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Create/replace a draft or published post. Scheduling has its own request ({@link ScheduleRequest}). */
public record PostRequest(
    @NotBlank(message = "Content is required")
    @Size(max = 63206, message = "Content must be at most 63206 characters")
    String content,

    @NotBlank(message = "Platform is required")
    @Pattern(regexp = "facebook|x|linkedin|instagram", message = "Platform must be one of facebook, x, linkedin, instagram")
    String platformId,

    @NotBlank(message = "Author is required")
    @Size(max = 60, message = "Author must be at most 60 characters")
    String authorName,

    /** DRAFT (default) or PUBLISHED. SCHEDULED is only reachable through /api/v1/schedule. */
    PostStatus status
) {}
