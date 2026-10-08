package com.brian.postcomposer.controller;

import com.brian.postcomposer.dto.ApiResponse;
import com.brian.postcomposer.dto.PostResponse;
import com.brian.postcomposer.dto.RescheduleRequest;
import com.brian.postcomposer.dto.ScheduleRequest;
import com.brian.postcomposer.service.ScheduleService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** The calendar's backend: list the plan, schedule, drag to reschedule (PATCH), unschedule. */
@RestController
@RequestMapping("/api/v1/schedule")
public class ScheduleController {
    private final ScheduleService service;

    public ScheduleController(ScheduleService service) { this.service = service; }

    @GetMapping
    public ApiResponse<List<PostResponse>> list() {
        return ApiResponse.success("Scheduled posts retrieved", service.findAll().stream().map(PostResponse::from).toList());
    }

    @GetMapping("/{id}")
    public ApiResponse<PostResponse> get(@PathVariable UUID id) {
        return ApiResponse.success("Scheduled post retrieved", PostResponse.from(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PostResponse>> schedule(@Valid @RequestBody ScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Post scheduled", PostResponse.from(service.schedule(request))));
    }

    @PatchMapping("/{id}")
    public ApiResponse<PostResponse> reschedule(@PathVariable UUID id, @Valid @RequestBody RescheduleRequest request) {
        return ApiResponse.success("Post rescheduled", PostResponse.from(service.reschedule(id, request)));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> unschedule(@PathVariable UUID id) {
        service.unschedule(id);
        return ApiResponse.success("Post unscheduled", null);
    }
}
