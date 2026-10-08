package com.brian.postcomposer;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.brian.postcomposer.model.Author;
import com.brian.postcomposer.model.Post;
import com.brian.postcomposer.model.PostStatus;
import com.brian.postcomposer.repository.AuthorRepository;
import com.brian.postcomposer.repository.PostRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.test.web.servlet.MockMvc;

/** Experiment 2.2.1 - pagination, sorting and filtering on the list endpoints. */
@SpringBootTest
@AutoConfigureMockMvc
class PaginationApiTest {
    @Autowired MockMvc mvc;
    @Autowired PostRepository repository;
    @Autowired AuthorRepository authorRepository;
    @Autowired CacheManager cacheManager;

    @BeforeEach
    void seed() {
        repository.deleteAll();
        cacheManager.getCacheNames().forEach(n -> cacheManager.getCache(n).clear());
        List<Author> authors = List.of(authorFor("Author 0"), authorFor("Author 1"), authorFor("Author 2"));
        Instant base = Instant.parse("2030-01-01T00:00:00Z");
        for (int i = 0; i < 25; i++) {
            Post p = new Post();
            p.setContent("post " + i);
            p.setPlatformId(i % 5 == 0 ? "x" : "linkedin");
            p.setAuthor(authors.get(i % 3));
            p.setStatus(i < 5 ? PostStatus.SCHEDULED : i < 15 ? PostStatus.DRAFT : PostStatus.PUBLISHED);
            if (p.getStatus() == PostStatus.SCHEDULED) p.setScheduledFor(base.plus(5 - i, ChronoUnit.DAYS));
            repository.save(p);
        }
    }

    private Author authorFor(String name) {
        return authorRepository.findByName(name).orElseGet(() -> authorRepository.save(new Author(name)));
    }

    @Test
    void pagesCarryMetadataAndDoNotOverlap() throws Exception {
        mvc.perform(get("/api/v1/posts").param("size", "10").param("page", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items", hasSize(5)))
            .andExpect(jsonPath("$.data.page").value(2))
            .andExpect(jsonPath("$.data.size").value(10))
            .andExpect(jsonPath("$.data.totalElements").value(25))
            .andExpect(jsonPath("$.data.totalPages").value(3))
            .andExpect(jsonPath("$.data.hasNext").value(false))
            .andExpect(jsonPath("$.data.hasPrevious").value(true));
        mvc.perform(get("/api/v1/posts").param("size", "10").param("page", "0"))
            .andExpect(jsonPath("$.data.hasNext").value(true))
            .andExpect(jsonPath("$.data.hasPrevious").value(false));
    }

    @Test
    void defaultsApplyAndSizeIsCapped() throws Exception {
        mvc.perform(get("/api/v1/posts"))
            .andExpect(jsonPath("$.data.size").value(20))
            .andExpect(jsonPath("$.data.items", hasSize(20)))
            .andExpect(jsonPath("$.data.sort", hasItem("updatedAt,desc")));
        mvc.perform(get("/api/v1/posts").param("size", "5000"))
            .andExpect(jsonPath("$.data.size").value(100));
    }

    @Test
    void sortsByRequestedFieldAndDirection() throws Exception {
        mvc.perform(get("/api/v1/posts").param("sort", "author,asc").param("sort", "createdAt,desc").param("size", "3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[*].authorName", everyItem(is("Author 0"))));
        mvc.perform(get("/api/v1/posts").param("sort", "platformId,desc").param("size", "1"))
            .andExpect(jsonPath("$.data.items[0].platformId").value("x"));
    }

    @Test
    void rejectsUnsortableFields() throws Exception {
        mvc.perform(get("/api/v1/posts").param("sort", "content,asc"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", startsWith("Cannot sort by 'content'")));
        mvc.perform(get("/api/v1/posts").param("sort", "password")).andExpect(status().isBadRequest());
    }

    @Test
    void filtersCombineWithPaging() throws Exception {
        mvc.perform(get("/api/v1/posts").param("status", "DRAFT").param("platformId", "x"))
            .andExpect(jsonPath("$.data.totalElements").value(2)); // i = 5 and 10
        mvc.perform(get("/api/v1/posts").param("status", "PUBLISHED").param("size", "4"))
            .andExpect(jsonPath("$.data.totalElements").value(10))
            .andExpect(jsonPath("$.data.totalPages").value(3));
    }

    @Test
    void pageBeyondTheEndIsEmptyNotAnError() throws Exception {
        mvc.perform(get("/api/v1/posts").param("page", "99"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items", hasSize(0)))
            .andExpect(jsonPath("$.data.totalElements").value(25));
    }

    @Test
    void schedulePlanIsPagedSoonestFirst() throws Exception {
        mvc.perform(get("/api/v1/schedule").param("size", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalElements").value(5))
            .andExpect(jsonPath("$.data.items", hasSize(2)))
            .andExpect(jsonPath("$.data.sort", hasItem("scheduledFor,asc")))
            .andExpect(jsonPath("$.data.items[0].scheduledFor").value("2030-01-02T00:00:00Z"));
    }
}
