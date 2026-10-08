package com.brian.postcomposer.model;

import java.text.BreakIterator;
import java.util.Arrays;
import java.util.Optional;

/**
 * Server-side mirror of {@code src/config/platforms.js}. The limits are enforced here as well as in the UI,
 * because the browser is not a trusted caller.
 */
public enum Platform {
    FACEBOOK("facebook", 63206),
    X("x", 280),
    LINKEDIN("linkedin", 3000),
    INSTAGRAM("instagram", 2200);

    private final String id;
    private final int characterLimit;

    Platform(String id, int characterLimit) {
        this.id = id;
        this.characterLimit = characterLimit;
    }

    public String id() { return id; }
    public int characterLimit() { return characterLimit; }

    public static Optional<Platform> fromId(String id) {
        return Arrays.stream(values()).filter(p -> p.id.equalsIgnoreCase(id)).findFirst();
    }

    /** Counts user-perceived characters (grapheme clusters), matching the UI's Intl.Segmenter counter. */
    public static int countCharacters(String text) {
        BreakIterator it = BreakIterator.getCharacterInstance();
        it.setText(text);
        int count = 0;
        while (it.next() != BreakIterator.DONE) count++;
        return count;
    }
}
