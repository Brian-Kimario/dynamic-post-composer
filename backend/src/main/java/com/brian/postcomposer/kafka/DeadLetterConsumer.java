package com.brian.postcomposer.kafka;

import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

/** Persists dead-lettered events (with the failure reason from the DLT headers) so they can be inspected and replayed. */
@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
public class DeadLetterConsumer {
    private static final Logger log = LoggerFactory.getLogger(DeadLetterConsumer.class);
    private final DeadLetterRepository deadLetters;

    public DeadLetterConsumer(DeadLetterRepository deadLetters) { this.deadLetters = deadLetters; }

    @KafkaListener(topics = "${app.kafka.dlt-topic}", id = "dead-letter-consumer")
    void onDeadLetter(PostScheduledEvent event,
            @Header(value = KafkaHeaders.DLT_EXCEPTION_CAUSE_FQCN, required = false) byte[] errorClass,
            @Header(value = KafkaHeaders.DLT_EXCEPTION_MESSAGE, required = false) byte[] errorMessage) {
        if (event == null || event.eventId() == null || deadLetters.existsByEventId(event.eventId())) return;
        deadLetters.save(new DeadLetter(event.eventId(), event.postId(), String.valueOf(event),
            text(errorClass), rootMessage(text(errorMessage))));
        log.error("Event {} dead-lettered: {}", event.eventId(), text(errorMessage));
    }

    /** Spring wraps listener failures as "Listener method '...' threw exception; <cause>"; keep only the cause. */
    private static String rootMessage(String message) {
        if (message == null) return null;
        int i = message.lastIndexOf("exception; ");
        return i >= 0 ? message.substring(i + "exception; ".length()) : message;
    }

    private static String text(byte[] b) { return b == null ? null : new String(b, StandardCharsets.UTF_8); }
}
