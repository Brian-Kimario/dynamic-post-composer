package com.brian.postcomposer.repository;

import com.brian.postcomposer.model.Post;
import com.brian.postcomposer.model.PostStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<Post, UUID> {
    List<Post> findByStatusOrderByUpdatedAtDesc(PostStatus status);
    List<Post> findAllByOrderByUpdatedAtDesc();
    List<Post> findByStatusOrderByScheduledForAsc(PostStatus status);
    Optional<Post> findByIdAndStatus(UUID id, PostStatus status);
}
