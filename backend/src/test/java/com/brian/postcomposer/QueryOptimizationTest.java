package com.brian.postcomposer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.brian.postcomposer.model.Author;
import com.brian.postcomposer.model.Post;
import com.brian.postcomposer.model.PostStatus;
import com.brian.postcomposer.repository.AuthorRepository;
import com.brian.postcomposer.repository.PostRepository;
import jakarta.persistence.EntityManagerFactory;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Experiment 2.2.2 - proves the optimisations by counting SQL statements with Hibernate statistics rather than by
 * trusting that an annotation did something.
 */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@AutoConfigureMockMvc
@WithMockUser(roles = "ADMIN") // 2.3: every endpoint needs a signed-in user; these tests are about data, not auth
class QueryOptimizationTest {
    private static final int AUTHORS = 10;
    private static final int PAGE_SIZE = 10;

    @Autowired MockMvc mvc;
    @Autowired PostRepository posts;
    @Autowired AuthorRepository authors;
    @Autowired CacheManager caches;
    @Autowired EntityManagerFactory emf;
    @Autowired TransactionTemplate tx;
    Statistics stats;

    @BeforeEach
    void seed() {
        posts.deleteAll();
        authors.deleteAll();
        caches.getCacheNames().forEach(n -> caches.getCache(n).clear());
        List<Author> saved = new ArrayList<>();
        for (int i = 0; i < AUTHORS; i++) saved.add(authors.save(new Author("Writer " + i)));
        for (int i = 0; i < 40; i++) {
            Post p = new Post();
            p.setContent("c" + i);
            p.setPlatformId(i % 2 == 0 ? "x" : "linkedin");
            p.setStatus(i % 4 == 0 ? PostStatus.PUBLISHED : PostStatus.DRAFT);
            p.setLikes(i * 10);
            p.setAuthor(saved.get(i % AUTHORS));   // every row in a page has a different author
            posts.save(p);
        }
        stats = emf.unwrap(SessionFactory.class).getStatistics();
        stats.clear();
    }

    // ---- N+1 ----

    @Test
    void defaultFindAllSuffersFromNPlusOne() {
        long statements = tx.execute(s -> {
            stats.clear();
            posts.findAll(PageRequest.of(0, PAGE_SIZE, Sort.by("id"))).forEach(p -> p.getAuthor().getName());
            return stats.getPrepareStatementCount();
        });
        // 1 page query + 1 count + one lazy author load per distinct author in the page (up to N).
        assertThat(statements).isGreaterThan(2).isLessThanOrEqualTo(PAGE_SIZE + 2);
    }

    @Test
    void joinFetchLoadsTheSamePageInTwoStatements() {
        long statements = tx.execute(s -> {
            stats.clear();
            posts.search(null, null, PageRequest.of(0, PAGE_SIZE, Sort.by("id")))
                .forEach(p -> p.getAuthor().getName());
            return stats.getPrepareStatementCount();
        });
        assertThat(statements).isEqualTo(2);   // rows (with authors joined) + count
    }

    @Test
    void sortingByAuthorNameStillUsesTheFetchJoin() throws Exception {
        stats.clear();
        mvc.perform(get("/api/v1/posts").param("sort", "author,asc").param("size", "" + PAGE_SIZE))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[0].authorName").value("Writer 0"));
        assertThat(stats.getPrepareStatementCount()).isEqualTo(2);
    }

    // ---- Caching ----

    @Test
    void repeatedPageReadsAreServedFromCache() throws Exception {
        mvc.perform(get("/api/v1/posts").param("size", "5")).andExpect(status().isOk());
        long afterFirst = stats.getPrepareStatementCount();
        assertThat(afterFirst).isEqualTo(2);

        mvc.perform(get("/api/v1/posts").param("size", "5")).andExpect(status().isOk());
        assertThat(stats.getPrepareStatementCount()).isEqualTo(afterFirst);   // no SQL at all

        mvc.perform(get("/api/v1/posts").param("size", "6")).andExpect(status().isOk());   // different key
        assertThat(stats.getPrepareStatementCount()).isGreaterThan(afterFirst);
    }

    @Test
    void singlePostIsCachedThenEvictedOnUpdateAndDelete() throws Exception {
        String id = posts.findAll().get(0).getId().toString();
        stats.clear();

        mvc.perform(get("/api/v1/posts/" + id)).andExpect(status().isOk());
        long afterFirst = stats.getPrepareStatementCount();
        assertThat(afterFirst).isEqualTo(1);   // post + author in one fetch
        mvc.perform(get("/api/v1/posts/" + id)).andExpect(status().isOk());
        assertThat(stats.getPrepareStatementCount()).isEqualTo(afterFirst);

        mvc.perform(put("/api/v1/posts/" + id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"edited\",\"platformId\":\"x\",\"authorName\":\"Writer 0\"}"))
            .andExpect(status().isOk());
        // Not stale: the next read reflects the edit.
        mvc.perform(get("/api/v1/posts/" + id)).andExpect(jsonPath("$.data.content").value("edited"));

        mvc.perform(delete("/api/v1/posts/" + id)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/posts/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void writesInvalidateCachedPages() throws Exception {
        mvc.perform(get("/api/v1/posts").param("size", "1")).andExpect(jsonPath("$.data.totalElements").value(40));
        mvc.perform(post("/api/v1/posts").contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"new\",\"platformId\":\"x\",\"authorName\":\"Brand New\"}"))
            .andExpect(status().isCreated());
        mvc.perform(get("/api/v1/posts").param("size", "1")).andExpect(jsonPath("$.data.totalElements").value(41));
    }

    // ---- Native SQL aggregates ----

    @Test
    void nativeStatsAggregateAndAreCached() throws Exception {
        mvc.perform(get("/api/v1/stats").param("topAuthors", "3").param("topPosts", "3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.byPlatformAndStatus", hasSize(3)))
            .andExpect(jsonPath("$.data.byPlatformAndStatus[?(@.platformId=='x' && @.status=='PUBLISHED')].total",
                contains(10)))
            .andExpect(jsonPath("$.data.topAuthors", hasSize(3)))
            .andExpect(jsonPath("$.data.topAuthors[0].total").value(4))
            .andExpect(jsonPath("$.data.topPosts", hasSize(3)))
            .andExpect(jsonPath("$.data.topPosts[0].likes").value(360))   // highest-liked PUBLISHED (i=36)
            .andExpect(jsonPath("$.data.topPosts[1].likes").value(320));
        long afterFirst = stats.getPrepareStatementCount();
        assertThat(afterFirst).isEqualTo(3);   // one native statement per aggregate

        mvc.perform(get("/api/v1/stats").param("topAuthors", "3").param("topPosts", "3"))
            .andExpect(status().isOk());
        assertThat(stats.getPrepareStatementCount()).isEqualTo(afterFirst);
    }

    @Test
    void statsRejectOutOfRangeLimit() throws Exception {
        mvc.perform(get("/api/v1/stats").param("topPosts", "0"))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/stats").param("topAuthors", "500"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Validation failed"));
    }
}
