package com.brian.postcomposer.service;

import static com.brian.postcomposer.config.CacheConfig.*;

import com.brian.postcomposer.dto.PageResponse;
import com.brian.postcomposer.dto.PostResponse;
import com.brian.postcomposer.dto.RescheduleRequest;
import com.brian.postcomposer.dto.ScheduleRequest;
import com.brian.postcomposer.exception.ResourceNotFoundException;
import com.brian.postcomposer.model.Post;
import com.brian.postcomposer.model.PostStatus;
import com.brian.postcomposer.repository.PostRepository;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Scheduling is a view over {@link Post}: a scheduled post is one whose status is SCHEDULED. It shares the posts
 * cache, so its writes evict the same entries as {@link PostService}'s.
 */
@Service
@Transactional
public class ScheduleService {
    private static final Logger log = LoggerFactory.getLogger(ScheduleService.class);
    private final PostRepository repository;
    private final AuthorService authors;

    public ScheduleService(PostRepository repository, AuthorService authors) {
        this.repository = repository;
        this.authors = authors;
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> findPage(Pageable pageable) {
        return PageResponse.of(
            repository.search(PostStatus.SCHEDULED, null, PageableSanitizer.sanitize(pageable, PostService.SORTABLE)),
            PostResponse::from);
    }

    @Transactional(readOnly = true)
    public PostResponse getById(UUID id) { return PostResponse.from(find(id)); }

    @CacheEvict(cacheNames = {POST_PAGES, STATS}, allEntries = true)
    public PostResponse schedule(ScheduleRequest request) {
        String content = request.content().trim();
        PostService.requireFits(request.platformId(), content);
        Post post = new Post();
        post.setContent(content);
        post.setPlatformId(request.platformId().toLowerCase());
        post.setAuthor(authors.resolve(request.authorName()));
        post.setStatus(PostStatus.SCHEDULED);
        post.setScheduledFor(request.scheduledFor());
        Post saved = repository.save(post);
        log.info("Scheduled post {} for {}", saved.getId(), saved.getScheduledFor());
        return PostResponse.from(saved);
    }

    @Caching(evict = {
        @CacheEvict(cacheNames = POST, key = "#id"),
        @CacheEvict(cacheNames = {POST_PAGES, STATS}, allEntries = true)})
    public PostResponse reschedule(UUID id, RescheduleRequest request) {
        Post post = find(id);
        post.setScheduledFor(request.scheduledFor());
        log.info("Rescheduled post {} to {}", id, request.scheduledFor());
        return PostResponse.from(repository.save(post));
    }

    @Caching(evict = {
        @CacheEvict(cacheNames = POST, key = "#id"),
        @CacheEvict(cacheNames = {POST_PAGES, STATS}, allEntries = true)})
    public void unschedule(UUID id) {
        repository.delete(find(id));
        log.info("Unscheduled post {}", id);
    }

    private Post find(UUID id) {
        return repository.findByIdAndStatus(id, PostStatus.SCHEDULED)
            .orElseThrow(() -> new ResourceNotFoundException("Scheduled post", id));
    }
}
