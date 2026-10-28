package com.brian.postcomposer.kafka;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Producer. Runs only after the post row is committed, so a consumer can never see an event for a post that was
 * rolled back. The idempotent producer (enable.idempotence + acks=all) stops broker-side duplicates on send retries.
 */
@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
public class ScheduledPostPublisher {
    private static final Logger log = LoggerFactory.getLogger(ScheduledPostPublisher.class);
    private final KafkaTemplate<String, Object> template;
    private final String topic;

    public ScheduledPostPublisher(KafkaTemplate<String, Object> template, @Value("${app.kafka.topic}") String topic) {
        this.template = template;
        this.topic = topic;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void onScheduled(PostScheduledCreated created) { publish(created.event()); }

    public void publish(PostScheduledEvent event) {
        template.send(topic, event.postId().toString(), event).whenComplete((result, ex) -> {
            if (ex != null) log.error("Could not publish event {}: {}", event.eventId(), ex.getMessage());
            else log.info("Published event {} to {}-{}@{}", event.eventId(), topic, result.getRecordMetadata().partition(), result.getRecordMetadata().offset());
        });
    }
}
