package com.brian.postcomposer.kafka;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeadLetterRepository extends JpaRepository<DeadLetter, UUID> {
    boolean existsByEventId(String eventId);
}
