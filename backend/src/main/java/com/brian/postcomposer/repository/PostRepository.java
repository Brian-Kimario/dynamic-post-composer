package com.brian.postcomposer.repository;

import com.brian.postcomposer.model.Post;
import com.brian.postcomposer.model.PostStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, UUID> {
    /** One query for the page and one {@code count(*)} for the total; both skip a filter whose value is null. */
    @Query("select p from Post p where (:status is null or p.status = :status) "
         + "and (:platformId is null or p.platformId = :platformId)")
    Page<Post> search(@Param("status") PostStatus status, @Param("platformId") String platformId, Pageable pageable);

    Optional<Post> findByIdAndStatus(UUID id, PostStatus status);
}
