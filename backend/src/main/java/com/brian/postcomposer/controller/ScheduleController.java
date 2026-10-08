package com.brian.postcomposer.controller;

import com.brian.postcomposer.dto.ApiResponse;
import com.brian.postcomposer.dto.PageResponse;
import com.brian.postcomposer.dto.PostResponse;
import com.brian.postcomposer.dto.RescheduleRequest;
import com.brian.postcomposer.dto.ScheduleRequest;
import com.brian.postcomposer.service.ScheduleService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** The calendar's backend: list the plan, schedule, drag to reschedule (PATCH), unschedule. */
@RestController
@RequestMapping("/api/v1/schedule")
public class ScheduleController {
    private final ScheduleService service;

    public ScheduleController(ScheduleService service) { this.service = service; }

    /** The plan, soonest first by default; paged like every other list. */
    @PreAuthorize("hasAnyRole('ADMIN','EDITOR','VIEWER')")
    @GetMapping
    public ApiResponse<PageResponse<PostResponse>> list(
            @PageableDefault(size = 50, sort = "scheduledFor", direction = Sort.Direction.ASC) Pageable pageable) {
        return ApiResponse.success("Scheduled posts retrieved",
            service.findPage(pageable));
    }

    @PreAuthorize("hasAnyRole('ADMIN','EDITOR','VIEWER')")
    @GetMapping("/{id}")
    public ApiResponse<PostResponse> get(@PathVariable UUID id) {
        return ApiResponse.success("Scheduled post retrieved", service.getById(id));
    }

    @PreAuthorize("hasAnyRole('ADMIN','EDITOR')")
    @PostMapping
    public ResponseEntity<ApiResponse<PostResponse>> schedule(@Valid @RequestBody ScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Post scheduled", service.schedule(request)));
    }

    @PreAuthorize("hasAnyRole('ADMIN','EDITOR')")
    @PatchMapping("/{id}")
    public ApiResponse<PostResponse> reschedule(@PathVariable UUID id, @Valid @RequestBody RescheduleRequest request) {
        return ApiResponse.success("Post rescheduled", service.reschedule(id, request));
    }

    @PreAuthorize("hasAnyRole('ADMIN','EDITOR')")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> unschedule(@PathVariable UUID id) {
        service.unschedule(id);
        return ApiResponse.success("Post unscheduled", null);
    }
}
