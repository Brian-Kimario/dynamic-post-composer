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
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/** Experiment 3.2.1 - Testcontainers: the same flow as KafkaReliabilityTest, against a real Kafka broker in Docker. */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {
    "app.kafka.enabled=true",
    "app.kafka.retry.initial-interval-ms=100",
    "spring.kafka.consumer.group-id=testcontainers"})
class KafkaTestcontainersTest {
    @Container
    static final KafkaContainer KAFKA = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.1"));

    @DynamicPropertySource
    static void kafka(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
    }

    @Autowired ScheduleService scheduling;
    @Autowired ProcessedEventRepository processed;
    @Autowired DeadLetterRepository deadLetters;

    private UUID schedule(String content) {
        return scheduling.schedule(new ScheduleRequest(content, "x", "TC Author " + UUID.randomUUID().toString().substring(0, 6),
            Instant.now().plusSeconds(3600))).id();
    }

    @Test
    void scheduledPostIsProcessedThroughARealBroker() {
        UUID id = schedule("through a real broker");
        await().atMost(Duration.ofSeconds(30)).until(() -> processed.findAll().stream().anyMatch(e -> e.getPostId().equals(id)));
    }

    @Test
    void failingEventEndsInTheDeadLetterTopic() {
        UUID id = schedule("never works [fail-transient]");
        await().atMost(Duration.ofSeconds(40)).until(() -> deadLetters.findAll().stream().anyMatch(d -> id.equals(d.getPostId())));
        assertThat(processed.findAll().stream().anyMatch(e -> e.getPostId().equals(id))).isFalse();
    }
}
