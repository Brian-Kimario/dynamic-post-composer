package com.brian.postcomposer.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.brian.postcomposer.exception.BusinessRuleException;
import org.junit.jupiter.api.Test;

/** Same package as PostService so the package-private rule can be exercised directly. */
class PostRulesTest {
    @Test
    void contentAtTheLimitFits() {
        assertThatCode(() -> PostService.requireFits("x", "a".repeat(280))).doesNotThrowAnyException();
    }

    @Test
    void contentOverTheLimitIsRejectedWithTheOverage() {
        assertThatThrownBy(() -> PostService.requireFits("x", "a".repeat(285)))
            .isInstanceOf(BusinessRuleException.class).hasMessageContaining("5 characters over the x limit of 280");
    }

    @Test
    void unknownPlatformIsRejected() {
        assertThatThrownBy(() -> PostService.requireFits("myspace", "hi")).isInstanceOf(BusinessRuleException.class);
    }
}
