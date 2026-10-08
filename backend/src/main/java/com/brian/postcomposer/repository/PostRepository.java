package com.brian.postcomposer.repository;

import com.brian.postcomposer.model.Post;
import com.brian.postcomposer.model.PostStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, UUID> {
    /**
     * Solves N+1. The inherited {@code findAll(Pageable)} loads N posts in one query and then one more query per
     * distinct author the moment a response touches {@code post.getAuthor()}. {@code JOIN FETCH} brings the author in
     * the same statement, so a page costs 2 queries (rows + count) regardless of its size.
     *
     * The count query is written out because Spring cannot derive one from a fetch join, and a count has no use
     * for the join.
     */
    @Query(value = "select p from Post p join fetch p.author where (:status is null or p.status = :status) "
                 + "and (:platformId is null or p.platformId = :platformId)",
           countQuery = "select count(p) from Post p where (:status is null or p.status = :status) "
                 + "and (:platformId is null or p.platformId = :platformId)")
    Page<Post> search(@Param("status") PostStatus status, @Param("platformId") String platformId, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "author")
    Optional<Post> findById(UUID id);

    @EntityGraph(attributePaths = "author")
    Optional<Post> findByIdAndStatus(UUID id, PostStatus status);

    // ---- Native SQL: aggregates are clearer, and cheaper, as plain GROUP BY than as entity queries ----

    interface PlatformStatusCount { String getPlatformId(); String getStatus(); long getTotal(); }
    interface AuthorActivity { String getAuthor(); long getTotal(); }

    @Query(nativeQuery = true, value = """
        select platform_id as platformId, status as status, count(*) as total
        from posts group by platform_id, status order by platform_id, status""")
    List<PlatformStatusCount> countByPlatformAndStatus();

    @Query(nativeQuery = true, value = """
        select a.name as author, count(p.id) as total
        from authors a join posts p on p.author_id = a.id
        group by a.id, a.name order by total desc, a.name limit :limit""")
    List<AuthorActivity> topAuthors(@Param("limit") int limit);
}
