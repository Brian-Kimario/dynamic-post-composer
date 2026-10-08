package com.brian.postcomposer.controller;

import com.brian.postcomposer.dto.ApiResponse;
import com.brian.postcomposer.dto.StatsResponse;
import com.brian.postcomposer.service.StatsService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated
@RestController
@RequestMapping("/api/v1/stats")
public class StatsController {
    private final StatsService service;

    public StatsController(StatsService service) { this.service = service; }

    /** Post counts per platform and status, plus the most active authors and the top-liked published posts. */
    @GetMapping
    public ApiResponse<StatsResponse> overview(
            @RequestParam(defaultValue = "5") @Min(value = 1, message = "must be at least 1")
            @Max(value = 25, message = "must be at most 25") int topAuthors,
            @RequestParam(defaultValue = "5") @Min(value = 1, message = "must be at least 1")
            @Max(value = 25, message = "must be at most 25") int topPosts) {
        return ApiResponse.success("Stats retrieved", service.overview(topAuthors, topPosts));
    }
}
