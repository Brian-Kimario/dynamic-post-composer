package com.brian.postcomposer.controller;

import com.brian.postcomposer.dto.ApiResponse;
import com.brian.postcomposer.exception.BusinessRuleException;
import com.brian.postcomposer.exception.ResourceNotFoundException;
import com.brian.postcomposer.kafka.*;
import com.brian.postcomposer.model.Post;
import com.brian.postcomposer.repository.PostRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/** Admin view of the Kafka reliability state (Experiment 3.1.1): the idempotency ledger and the dead letters. */
@RestController
@RequestMapping("/api/v1/kafka")
@PreAuthorize("hasRole('ADMIN')")
public class KafkaController {
    private final ProcessedEventRepository processed;
    private final DeadLetterRepository deadLetters;
    private final PostRepository posts;
    private final Optional<ScheduledPostPublisher> publisher;

    public KafkaController(ProcessedEventRepository processed, DeadLetterRepository deadLetters, PostRepository posts,
            Optional<ScheduledPostPublisher> publisher) {
        this.processed = processed;
        this.deadLetters = deadLetters;
        this.posts = posts;
        this.publisher = publisher;
    }

    @GetMapping("/summary")
    public ApiResponse<Map<String, Object>> summary() {
        long duplicates = processed.findAll().stream().mapToLong(ProcessedEvent::getDuplicatesSkipped).sum();
        return ApiResponse.success("Kafka reliability summary", Map.of(
            "kafkaEnabled", publisher.isPresent(),
            "processedEvents", processed.count(),
            "duplicatesSkipped", duplicates,
            "deadLetters", deadLetters.count()));
    }

    @GetMapping("/processed-events")
    public ApiResponse<List<ProcessedEvent>> processedEvents() {
        return ApiResponse.success("Processed events (idempotency ledger)", processed.findAll(Sort.by(Sort.Direction.DESC, "processedAt")));
    }

    @GetMapping("/dead-letters")
    public ApiResponse<List<DeadLetter>> deadLetters() {
        return ApiResponse.success("Dead-lettered events", deadLetters.findAll(Sort.by(Sort.Direction.DESC, "failedAt")));
    }

    /** Re-sends an already processed event with the SAME eventId, to demonstrate that the duplicate is ignored. */
    @PostMapping("/replay/{eventId}")
    @Transactional(readOnly = true)
    public ApiResponse<Void> replay(@PathVariable String eventId) {
        var publisher = this.publisher.orElseThrow(() -> new BusinessRuleException("Kafka is disabled (set KAFKA_ENABLED=true)"));
        ProcessedEvent done = processed.findById(eventId).orElseThrow(() -> new ResourceNotFoundException("Processed event", eventId));
        Post post = posts.findById(done.getPostId()).orElseThrow(() -> new ResourceNotFoundException("Post", done.getPostId().toString()));
        publisher.publish(new PostScheduledEvent(eventId, post.getId(), post.getPlatformId(), post.getContent(), post.getScheduledFor()));
        return ApiResponse.success("Event re-sent; the consumer should ignore it", null);
    }
}
