package com.brian.postcomposer.service;

import com.brian.postcomposer.dto.RescheduleRequest;
import com.brian.postcomposer.dto.ScheduleRequest;
import com.brian.postcomposer.exception.ResourceNotFoundException;
import com.brian.postcomposer.model.Post;
import com.brian.postcomposer.model.PostStatus;
import com.brian.postcomposer.repository.PostRepository;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Scheduling is a view over {@link Post}: a scheduled post is one whose status is SCHEDULED. */
@Service
@Transactional
public class ScheduleService {
    private static final Logger log = LoggerFactory.getLogger(ScheduleService.class);
    private final PostRepository repository;

    public ScheduleService(PostRepository repository) { this.repository = repository; }

    @Transactional(readOnly = true)
    public Page<Post> findPage(Pageable pageable) {
        return repository.search(PostStatus.SCHEDULED, null, PageableSanitizer.sanitize(pageable, PostService.SORTABLE));
    }

    @Transactional(readOnly = true)
    public Post findById(UUID id) {
        return repository.findByIdAndStatus(id, PostStatus.SCHEDULED)
            .orElseThrow(() -> new ResourceNotFoundException("Scheduled post", id));
    }

    public Post schedule(ScheduleRequest request) {
        String content = request.content().trim();
        PostService.requireFits(request.platformId(), content);
        Post post = new Post();
        post.setContent(content);
        post.setPlatformId(request.platformId().toLowerCase());
        post.setAuthorName(request.authorName().trim());
        post.setStatus(PostStatus.SCHEDULED);
        post.setScheduledFor(request.scheduledFor());
        Post saved = repository.save(post);
        log.info("Scheduled post {} for {}", saved.getId(), saved.getScheduledFor());
        return saved;
    }

    public Post reschedule(UUID id, RescheduleRequest request) {
        Post post = findById(id);
        post.setScheduledFor(request.scheduledFor());
        log.info("Rescheduled post {} to {}", id, request.scheduledFor());
        return repository.save(post);
    }

    public void unschedule(UUID id) {
        repository.delete(findById(id));
        log.info("Unscheduled post {}", id);
    }
}
