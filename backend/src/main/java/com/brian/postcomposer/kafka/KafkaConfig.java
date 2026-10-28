package com.brian.postcomposer.kafka;

import org.apache.kafka.common.TopicPartition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaOperations;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.ExponentialBackOffWithMaxRetries;
import org.apache.kafka.clients.admin.NewTopic;

/**
 * The reliability wiring: failed records are retried with exponential backoff, and once the retries are used up
 * (or the failure is permanent) the record is published to {@code <topic>.DLT} so the partition keeps moving.
 */
@Configuration
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
public class KafkaConfig {
    private static final Logger log = LoggerFactory.getLogger(KafkaConfig.class);

    @Bean
    NewTopic scheduledTopic(@Value("${app.kafka.topic}") String topic) {
        return TopicBuilder.name(topic).partitions(1).replicas(1).build();
    }

    @Bean
    NewTopic deadLetterTopic(@Value("${app.kafka.dlt-topic}") String topic) {
        return TopicBuilder.name(topic).partitions(1).replicas(1).build();
    }

    /** Spring Boot picks up a single CommonErrorHandler bean and applies it to every listener container. */
    @Bean
    DefaultErrorHandler kafkaErrorHandler(KafkaOperations<Object, Object> template,
            @Value("${app.kafka.dlt-topic}") String dltTopic,
            @Value("${app.kafka.retry.max-retries}") int maxRetries,
            @Value("${app.kafka.retry.initial-interval-ms}") long initialMs,
            @Value("${app.kafka.retry.multiplier}") double multiplier,
            @Value("${app.kafka.retry.max-interval-ms}") long maxIntervalMs) {
        var recoverer = new DeadLetterPublishingRecoverer(template, (record, ex) -> new TopicPartition(dltTopic, 0));
        var backOff = new ExponentialBackOffWithMaxRetries(maxRetries);
        backOff.setInitialInterval(initialMs);
        backOff.setMultiplier(multiplier);
        backOff.setMaxInterval(maxIntervalMs);
        var handler = new DefaultErrorHandler(recoverer, backOff);
        // Retrying cannot fix these: skip the backoff and dead-letter immediately.
        handler.addNotRetryableExceptions(PermanentPublishException.class);
        handler.setRetryListeners((record, ex, attempt) ->
            log.warn("Retry {} for event key={} offset={} failed: {}", attempt, record.key(), record.offset(), ex.getCause() != null ? ex.getCause().getMessage() : ex.getMessage()));
        return handler;
    }
}
