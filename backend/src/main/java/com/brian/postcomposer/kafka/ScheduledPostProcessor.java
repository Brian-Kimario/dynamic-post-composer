package com.brian.postcomposer.kafka;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The business step plus the idempotency check, in ONE transaction: the "processed" row commits together with the
 * work, so a crash can never leave the work done but unrecorded (or recorded but undone).
 *
 * <p>The outcome of "publishing to the platform" is simulated from markers in the content, so every path of the
 * lab can be demonstrated on demand: {@code [flaky]} fails twice then succeeds, {@code [fail-transient]} never
 * succeeds (retries exhaust), {@code [fail-permanent]} is not retryable.
 */
@Service
public class ScheduledPostProcessor {
    private static final Logger log = LoggerFactory.getLogger(ScheduledPostProcessor.class);
    static final int FLAKY_FAILURES = 2;
    private final ProcessedEventRepository processed;
    private final Map<String, Integer> attempts = new ConcurrentHashMap<>();

    public ScheduledPostProcessor(ProcessedEventRepository processed) { this.processed = processed; }

    /** @return true if the event was processed now, false if it was a duplicate and was skipped. */
    @Transactional
    public boolean process(PostScheduledEvent event) {
        var existing = processed.findById(event.eventId());
        if (existing.isPresent()) {
            existing.get().recordDuplicate();
            log.warn("Duplicate event {} ignored (already processed)", event.eventId());
            return false;
        }
        publishToPlatform(event);
        try {
            processed.saveAndFlush(new ProcessedEvent(event.eventId(), event.postId()));
        } catch (DataIntegrityViolationException raced) {
            // A concurrent delivery of the same event won the insert; treat ours as the duplicate.
            log.warn("Duplicate event {} ignored (concurrent insert)", event.eventId());
            return false;
        }
        log.info("Processed event {} for post {}", event.eventId(), event.postId());
        return true;
    }

    private void publishToPlatform(PostScheduledEvent event) {
        String content = event.content() == null ? "" : event.content();
        if (content.contains("[fail-permanent]")) {
            throw new PermanentPublishException("Platform rejected the post (permanent)");
        }
        if (content.contains("[fail-transient]")) {
            throw new TransientPublishException("Platform unavailable (attempt " + attempts.merge(event.eventId(), 1, Integer::sum) + ")");
        }
        if (content.contains("[flaky]")) {
            int attempt = attempts.merge(event.eventId(), 1, Integer::sum);
            if (attempt <= FLAKY_FAILURES) throw new TransientPublishException("Platform timeout (attempt " + attempt + ")");
            attempts.remove(event.eventId());
        }
    }
}
