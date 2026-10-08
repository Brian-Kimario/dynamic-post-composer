package com.brian.postcomposer.service;

import com.brian.postcomposer.dto.PostRequest;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PostService {
    private static final Logger log = LoggerFactory.getLogger(PostService.class);
    private final PostRepository repository;

    public PostService(PostRepository repository) { this.repository = repository; }

    /** Public sort names -> entity properties. */
    static final Map<String, String> SORTABLE = Map.of(
        "createdAt", "createdAt", "updatedAt", "updatedAt", "scheduledFor", "scheduledFor",
        "platformId", "platformId", "status", "status", "author", "authorName");

    @Transactional(readOnly = true)
    public Page<Post> findPage(PostStatus status, String platformId, Pageable pageable) {
        return repository.search(status, platformId == null ? null : platformId.toLowerCase(),
            PageableSanitizer.sanitize(pageable, SORTABLE));
    }

    @Transactional(readOnly = true)
    public Post findById(UUID id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Post", id));
    }

    public Post create(PostRequest request) {
        Post post = new Post();
        apply(request, post);
        Post saved = repository.save(post);
        log.info("Created {} post {} for {}", saved.getStatus(), saved.getId(), saved.getPlatformId());
        return saved;
    }

    public Post update(UUID id, PostRequest request) {
        Post post = findById(id);
        if (post.getStatus() == PostStatus.SCHEDULED) {
            throw new BusinessRuleException("Scheduled posts are managed through /api/v1/schedule");
        }
        apply(request, post);
        log.info("Updated post {}", id);
        return repository.save(post);
    }

    public void delete(UUID id) {
        repository.delete(findById(id));
        log.info("Deleted post {}", id);
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
        post.setAuthorName(request.authorName().trim());
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
