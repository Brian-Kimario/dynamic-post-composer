package com.brian.postcomposer.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.core.Ordered;
import org.springframework.context.annotation.Configuration;

/**
 * Turns on {@code @Cacheable}/{@code @CacheEvict}. The provider is Ehcache 3 through JCache (JSR-107); sizes and TTLs
 * live in {@code ehcache.xml}. Set {@code spring.cache.type=none} to disable caching entirely, e.g. to benchmark
 * with and without it.
 *
 * The advisor order puts the cache <em>outside</em> the transaction: a hit never opens a connection, and an eviction
 * runs only after the writing transaction has committed, so a concurrent reader cannot re-cache pre-commit data.
 */
@Configuration
@EnableCaching(order = Ordered.LOWEST_PRECEDENCE - 1)
public class CacheConfig {
    public static final String POST = "post";
    public static final String POST_PAGES = "postPages";
    public static final String STATS = "stats";
}
