package com.brian.postcomposer.controller;

import com.brian.postcomposer.dto.ApiResponse;
import com.brian.postcomposer.dto.PostRequest;
import com.brian.postcomposer.dto.PostResponse;
import com.brian.postcomposer.model.PostStatus;
import com.brian.postcomposer.service.PostService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Drafts and published posts. {@code GET /api/v1/posts?status=DRAFT|PUBLISHED|SCHEDULED} filters by lifecycle. */
@RestController
@RequestMapping("/api/v1/posts")
public class PostController {
    private final PostService service;

    public PostController(PostService service) { this.service = service; }

    @GetMapping
    public ApiResponse<List<PostResponse>> list(@RequestParam(required = false) PostStatus status) {
        return ApiResponse.success("Posts retrieved", service.findAll(status).stream().map(PostResponse::from).toList());
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
