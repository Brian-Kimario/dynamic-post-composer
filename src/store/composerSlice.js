import { createSlice } from '@reduxjs/toolkit';

/**
 * UI state, kept in its own slice and deliberately separate from the data
 * slices. `drafts` answers "what drafts exist"; this answers "what is the user
 * currently doing with them". Mixing the two makes both harder to reason about.
 *
 * Note what is *not* here: the post content itself. Content changes on every
 * keystroke and is used by exactly one component, so it stays in local state.
 * Putting it in the store would push a dispatch through the whole subscription
 * system on every character typed for no benefit.
 */
const composerSlice = createSlice({
  name: 'composer',
  initialState: {
    editingDraftId: null,
    /**
     * Bumped whenever the editor should be re-seeded. PostComposer is keyed on
     * this, so incrementing it remounts the composer with fresh initial state —
     * React's intended way to reset a component, rather than an effect that
     * copies props into state.
     */
    sessionId: 0,
  },
  reducers: {
    draftOpened(state, action) {
      state.editingDraftId = action.payload;
      state.sessionId += 1;
    },
    composerReset(state) {
      state.editingDraftId = null;
      state.sessionId += 1;
    },
    /**
     * Binds the composer to a newly created draft so the next save updates it
     * instead of creating a duplicate. Deliberately does not bump `sessionId`:
     * the content is already correct, and remounting would lose the caret.
     */
    draftBound(state, action) {
      state.editingDraftId = action.payload;
    },
    /**
     * Detaches from a draft *without* remounting, used after publishing. The
     * composer clears its own content in the same tick; bumping `sessionId`
     * here would tear the component down before it could show its success
     * notice.
     */
    composerUnbound(state) {
      state.editingDraftId = null;
    },
  },
});

export const { draftOpened, composerReset, draftBound, composerUnbound } = composerSlice.actions;

export const selectEditingDraftId = (state) => state.composer.editingDraftId;
export const selectComposerSessionId = (state) => state.composer.sessionId;

export default composerSlice.reducer;
