package com.brian.postcomposer.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.brian.postcomposer.kafka.*;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** The consumer's business rules, with the repository mocked: idempotency and the simulated failure markers. */
class ScheduledPostProcessorTest {
    private final ProcessedEventRepository repo = mock(ProcessedEventRepository.class);
    private final ScheduledPostProcessor processor = new ScheduledPostProcessor(repo);

    private static PostScheduledEvent event(String content) {
        return PostScheduledEvent.of(UUID.randomUUID(), "x", content, Instant.now().plusSeconds(60));
    }

    @Test
    void newEventIsProcessedAndRecorded() {
        when(repo.findById(any())).thenReturn(Optional.empty());
        assertThat(processor.process(event("hello"))).isTrue();
        verify(repo).saveAndFlush(any(ProcessedEvent.class));
    }

    @Test
    void duplicateEventIsSkippedAndCounted() {
        var e = event("hello");
        var done = new ProcessedEvent(e.eventId(), e.postId());
        when(repo.findById(e.eventId())).thenReturn(Optional.of(done));
        assertThat(processor.process(e)).isFalse();
        assertThat(done.getDuplicatesSkipped()).isEqualTo(1);
        verify(repo, never()).saveAndFlush(any());
    }

    @Test
    void permanentFailureThrowsAndIsNotRecorded() {
        when(repo.findById(any())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> processor.process(event("[fail-permanent]"))).isInstanceOf(PermanentPublishException.class);
        verify(repo, never()).saveAndFlush(any());
    }

    @Test
    void flakyEventFailsTwiceThenSucceeds() {
        when(repo.findById(any())).thenReturn(Optional.empty());
        var e = event("[flaky]");
        for (int i = 0; i < ScheduledPostProcessor.FLAKY_FAILURES; i++) {
            assertThatThrownBy(() -> processor.process(e)).isInstanceOf(TransientPublishException.class);
        }
        assertThat(processor.process(e)).isTrue();
    }
}
