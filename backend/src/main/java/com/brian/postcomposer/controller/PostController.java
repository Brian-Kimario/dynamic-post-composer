package com.brian.postcomposer.controller;

import com.brian.postcomposer.dto.ApiResponse;
import com.brian.postcomposer.dto.PageResponse;
import com.brian.postcomposer.dto.PostRequest;
import com.brian.postcomposer.dto.PostResponse;
import com.brian.postcomposer.model.PostStatus;
import com.brian.postcomposer.service.PostService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Drafts and published posts. {@code GET /api/v1/posts?status=DRAFT|PUBLISHED|SCHEDULED} filters by lifecycle. */
@RestController
@RequestMapping("/api/v1/posts")
public class PostController {
    private final PostService service;

    public PostController(PostService service) { this.service = service; }

    /**
     * {@code GET /api/v1/posts?status=DRAFT&platformId=x&page=0&size=20&sort=updatedAt,desc}. Defaults: 20 per page,
     * newest first; {@code size} is capped by {@code spring.data.web.pageable.max-page-size}.
     */
    @GetMapping
    public ApiResponse<PageResponse<PostResponse>> list(
            @RequestParam(required = false) PostStatus status,
            @RequestParam(required = false) String platformId,
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ApiResponse.success("Posts retrieved",
            PageResponse.of(service.findPage(status, platformId, pageable), PostResponse::from));
    }

    @GetMapping("/{id}")
    public ApiResponse<PostResponse> get(@PathVariable UUID id) {
        return ApiResponse.success("Post retrieved", PostResponse.from(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PostResponse>> create(@Valid @RequestBody PostRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Post created", PostResponse.from(service.create(request))));
    }

    @PutMapping("/{id}")
    public ApiResponse<PostResponse> update(@PathVariable UUID id, @Valid @RequestBody PostRequest request) {
        return ApiResponse.success("Post updated", PostResponse.from(service.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ApiResponse.success("Post deleted", null);
    }
}
