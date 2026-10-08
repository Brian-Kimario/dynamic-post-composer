package com.brian.postcomposer.config;

import com.brian.postcomposer.model.Author;
import com.brian.postcomposer.model.Platform;
import com.brian.postcomposer.model.Post;
import com.brian.postcomposer.model.PostStatus;
import com.brian.postcomposer.repository.AuthorRepository;
import com.brian.postcomposer.repository.PostRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Optional demo/benchmark data ({@code app.seed.enabled=true}): enough rows that pagination, indexes, N+1 and
 * caching are visible rather than theoretical. Seeded with a fixed random seed so runs are comparable.
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class SeedDataLoader implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(SeedDataLoader.class);
    private final PostRepository posts;
    private final AuthorRepository authors;
    private final int postCount;
    private final int authorCount;

    public SeedDataLoader(PostRepository posts, AuthorRepository authors,
                          @Value("${app.seed.posts}") int postCount, @Value("${app.seed.authors}") int authorCount) {
        this.posts = posts;
        this.authors = authors;
        this.postCount = postCount;
        this.authorCount = authorCount;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (posts.count() > 0) return;
        Random random = new Random(42);
        List<Author> savedAuthors = authors.saveAll(
            java.util.stream.IntStream.range(0, authorCount).mapToObj(i -> new Author("Author " + i)).toList());
        Platform[] platforms = Platform.values();
        PostStatus[] statuses = PostStatus.values();
        Instant now = Instant.now();
        List<Post> batch = new ArrayList<>(postCount);
        for (int i = 0; i < postCount; i++) {
            Post p = new Post();
            p.setContent("Seeded post #" + i + " - " + "lorem ipsum ".repeat(1 + random.nextInt(8)).trim());
            p.setPlatformId(platforms[random.nextInt(platforms.length)].id());
            p.setStatus(statuses[random.nextInt(statuses.length)]);
            if (p.getStatus() == PostStatus.SCHEDULED) p.setScheduledFor(now.plus(1 + random.nextInt(90), ChronoUnit.DAYS));
            p.setLikes(random.nextInt(10_000));
            p.setAuthor(savedAuthors.get(random.nextInt(savedAuthors.size())));
            batch.add(p);
        }
        posts.saveAll(batch);
        log.info("Seeded {} authors and {} posts", authorCount, postCount);
    }
}
