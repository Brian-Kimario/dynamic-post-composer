package com.brian.postcomposer.kafka;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/** Consumer. Throwing hands the record to the DefaultErrorHandler (backoff retries, then the DLT). */
@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
public class ScheduledPostConsumer {
    private final ScheduledPostProcessor processor;

    public ScheduledPostConsumer(ScheduledPostProcessor processor) { this.processor = processor; }

    @KafkaListener(topics = "${app.kafka.topic}", id = "scheduled-post-consumer")
    void onMessage(PostScheduledEvent event) { processor.process(event); }
}
