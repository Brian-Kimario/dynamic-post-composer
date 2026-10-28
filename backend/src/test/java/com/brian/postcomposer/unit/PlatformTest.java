package com.brian.postcomposer.unit;

import static org.assertj.core.api.Assertions.assertThat;

import com.brian.postcomposer.model.Platform;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Experiment 3.2.1 - unit tests: no Spring context, no I/O, milliseconds. */
class PlatformTest {
    @ParameterizedTest
    @CsvSource({"facebook,63206", "x,280", "linkedin,3000", "instagram,2200", "X,280"})
    void limitsMatchTheDocumentedPlatformLimits(String id, int limit) {
        assertThat(Platform.fromId(id)).get().extracting(Platform::characterLimit).isEqualTo(limit);
    }

    @Test
    void unknownPlatformIsEmpty() {
        assertThat(Platform.fromId("myspace")).isEmpty();
    }

    @Test
    void countsUserPerceivedCharactersNotUtf16Units() {
        assertThat(Platform.countCharacters("hello")).isEqualTo(5);
        assertThat(Platform.countCharacters("👍🏽")).isEqualTo(1);
        assertThat(Platform.countCharacters("")).isZero();
    }
}
