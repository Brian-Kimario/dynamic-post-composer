package com.brian.postcomposer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import com.brian.postcomposer.dto.ScheduleRequest;
import com.brian.postcomposer.kafka.*;
import com.brian.postcomposer.service.ScheduleService;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.test.context.EmbeddedKafka;

/** Experiment 3.1.1: retry with exponential backoff, dead-letter topic, idempotent consumer (real broker, embedded). */
@SpringBootTest(properties = {
    "app.kafka.enabled=true",
    "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}",
    "app.kafka.retry.max-retries=3",
    "app.kafka.retry.initial-interval-ms=100",
    "app.kafka.retry.multiplier=2.0",
    "app.kafka.retry.max-interval-ms=1000"})
@EmbeddedKafka(partitions = 1, topics = {"post.scheduled", "post.scheduled.DLT"})
class KafkaReliabilityTest {
    @Autowired ScheduleService scheduling;
    @Autowired ProcessedEventRepository processed;
    @Autowired DeadLetterRepository deadLetters;
    @Autowired ScheduledPostPublisher publisher;

    private UUID schedule(String content) {
        return scheduling.schedule(new ScheduleRequest(content, "x", "Test Author " + UUID.randomUUID().toString().substring(0, 6),
            Instant.now().plusSeconds(3600))).id();
    }

    private boolean processedFor(UUID postId) { return processed.findAll().stream().anyMatch(e -> e.getPostId().equals(postId)); }

    private boolean deadLetteredFor(UUID postId) { return deadLetters.findAll().stream().anyMatch(d -> postId.equals(d.getPostId())); }

    @Test
    void healthyEventIsProcessedOnce() {
        UUID id = schedule("hello kafka");
        await().atMost(Duration.ofSeconds(15)).until(() -> processedFor(id));
        assertThat(deadLetteredFor(id)).isFalse();
    }

    @Test
    void flakyEventSucceedsAfterBackoffRetries() {
        UUID id = schedule("fails twice then works [flaky]");
        await().atMost(Duration.ofSeconds(20)).until(() -> processedFor(id));
        assertThat(deadLetteredFor(id)).isFalse();
    }

    @Test
    void exhaustedRetriesLandInTheDeadLetterTopic() {
        UUID id = schedule("never works [fail-transient]");
        await().atMost(Duration.ofSeconds(20)).until(() -> deadLetteredFor(id));
        var letter = deadLetters.findAll().stream().filter(d -> id.equals(d.getPostId())).findFirst().orElseThrow();
        assertThat(letter.getErrorMessage()).contains("Platform unavailable");
        assertThat(processedFor(id)).isFalse();
    }

    @Test
    void permanentFailureSkipsRetriesAndIsDeadLettered() {
        UUID id = schedule("rejected [fail-permanent]");
        await().atMost(Duration.ofSeconds(10)).until(() -> deadLetteredFor(id));
        assertThat(deadLetters.findAll().stream().filter(d -> id.equals(d.getPostId())).findFirst().orElseThrow().getErrorClass())
            .contains("PermanentPublishException");
    }

    @Test
    void duplicateDeliveryIsProcessedExactlyOnce() {
        UUID id = schedule("deliver me twice");
        await().atMost(Duration.ofSeconds(15)).until(() -> processedFor(id));
        String eventId = processed.findAll().stream().filter(e -> e.getPostId().equals(id)).findFirst().orElseThrow().getEventId();

        var again = new PostScheduledEvent(eventId, id, "x", "deliver me twice", Instant.now().plusSeconds(3600));
        publisher.publish(again);
        publisher.publish(again);

        await().atMost(Duration.ofSeconds(15)).until(() -> processed.findById(eventId).orElseThrow().getDuplicatesSkipped() == 2);
        assertThat(processed.findAll().stream().filter(e -> e.getPostId().equals(id))).hasSize(1);
    }
}
