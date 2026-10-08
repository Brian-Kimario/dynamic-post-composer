package com.brian.postcomposer.service;

import static com.brian.postcomposer.config.CacheConfig.STATS;

import com.brian.postcomposer.dto.StatsResponse;
import com.brian.postcomposer.repository.PostRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Dashboard aggregates via native SQL. Read often, expensive on a big table, fine to be a minute stale: ideal cache fodder. */
@Service
public class StatsService {
    private static final Logger log = LoggerFactory.getLogger(StatsService.class);
    private final PostRepository repository;

    public StatsService(PostRepository repository) { this.repository = repository; }

    @Cacheable(cacheNames = STATS, key = "#topAuthors")
    @Transactional(readOnly = true)
    public StatsResponse overview(int topAuthors) {
        log.info("Cache miss: computing stats from the database");
        return new StatsResponse(
            repository.countByPlatformAndStatus().stream()
                .map(r -> new StatsResponse.PlatformStatusCount(r.getPlatformId(), r.getStatus(), r.getTotal())).toList(),
            repository.topAuthors(topAuthors).stream()
                .map(r -> new StatsResponse.AuthorActivity(r.getAuthor(), r.getTotal())).toList());
    }
}
