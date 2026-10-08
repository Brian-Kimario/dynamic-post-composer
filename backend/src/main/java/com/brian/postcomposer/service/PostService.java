package com.brian.postcomposer.service;

import static com.brian.postcomposer.config.CacheConfig.*;

import com.brian.postcomposer.dto.PageResponse;
import com.brian.postcomposer.dto.PostRequest;
import com.brian.postcomposer.dto.PostResponse;
import com.brian.postcomposer.exception.BusinessRuleException;
import com.brian.postcomposer.exception.ResourceNotFoundException;
import com.brian.postcomposer.model.Platform;
import com.brian.postcomposer.model.Post;
import com.brian.postcomposer.model.PostStatus;
import com.brian.postcomposer.repository.PostRepository;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Services return DTOs, not entities: the lazy author is resolved inside the transaction, and what lands in the cache
 * is an immutable record rather than a managed entity that would go stale (or detached) behind the cache's back.
 *
 * Cache policy: reads of a post and of a page are cached; every write evicts the affected post and drops all cached
 * pages and stats, because any write can move any row between pages.
 */
@Service
@Transactional
public class PostService {
    private static final Logger log = LoggerFactory.getLogger(PostService.class);
    private final PostRepository repository;
    private final AuthorService authors;

    public PostService(PostRepository repository, AuthorService authors) {
        this.repository = repository;
        this.authors = authors;
    }

    /** Public sort names -> entity properties. */
    static final Map<String, String> SORTABLE = Map.of(
        "createdAt", "createdAt", "updatedAt", "updatedAt", "scheduledFor", "scheduledFor",
        "platformId", "platformId", "status", "status", "author", "author.name");

    @Cacheable(cacheNames = POST_PAGES,
               key = "new org.springframework.cache.interceptor.SimpleKey(#status, #platformId, #pageable)")
    @Transactional(readOnly = true)
    public PageResponse<PostResponse> findPage(PostStatus status, String platformId, Pageable pageable) {
        log.info("Cache miss: loading posts page {} from the database", pageable);
        return PageResponse.of(
            repository.search(status, platformId == null ? null : platformId.toLowerCase(),
                PageableSanitizer.sanitize(pageable, SORTABLE)),
            PostResponse::from);
    }

    @Cacheable(cacheNames = POST, key = "#id")
    @Transactional(readOnly = true)
    public PostResponse getById(UUID id) {
        log.info("Cache miss: loading post {} from the database", id);
        return PostResponse.from(find(id));
    }

    @CacheEvict(cacheNames = {POST_PAGES, STATS}, allEntries = true)
    public PostResponse create(PostRequest request) {
        Post post = new Post();
        apply(request, post);
        Post saved = repository.save(post);
        log.info("Created {} post {} for {}", saved.getStatus(), saved.getId(), saved.getPlatformId());
        return PostResponse.from(saved);
    }

    @Caching(evict = {
        @CacheEvict(cacheNames = POST, key = "#id"),
        @CacheEvict(cacheNames = {POST_PAGES, STATS}, allEntries = true)})
    public PostResponse update(UUID id, PostRequest request) {
        Post post = find(id);
        if (post.getStatus() == PostStatus.SCHEDULED) {
            throw new BusinessRuleException("Scheduled posts are managed through /api/v1/schedule");
        }
        apply(request, post);
        log.info("Updated post {}", id);
        return PostResponse.from(repository.save(post));
    }

    @Caching(evict = {
        @CacheEvict(cacheNames = POST, key = "#id"),
        @CacheEvict(cacheNames = {POST_PAGES, STATS}, allEntries = true)})
    public void delete(UUID id) {
        repository.delete(find(id));
        log.info("Deleted post {}", id);
    }

    private Post find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Post", id));
    }

    private void apply(PostRequest request, Post post) {
        PostStatus status = request.status() == null ? PostStatus.DRAFT : request.status();
        if (status == PostStatus.SCHEDULED) {
            throw new BusinessRuleException("Use /api/v1/schedule to schedule a post");
        }
        String content = request.content().trim();
        requireFits(request.platformId(), content);
        post.setContent(content);
        post.setPlatformId(request.platformId().toLowerCase());
        post.setAuthor(authors.resolve(request.authorName()));
        post.setStatus(status);
        post.setScheduledFor(null);
    }

    /** Shared by drafts, published posts and the schedule: content must fit the target platform. */
    static void requireFits(String platformId, String content) {
        Platform platform = Platform.fromId(platformId)
            .orElseThrow(() -> new BusinessRuleException("Unknown platform " + platformId));
        int length = Platform.countCharacters(content);
        if (length > platform.characterLimit()) {
            throw new BusinessRuleException("Content is " + (length - platform.characterLimit())
                + " characters over the " + platform.id() + " limit of " + platform.characterLimit());
        }
    }
}
