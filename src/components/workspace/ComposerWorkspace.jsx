import { useCallback, useState } from 'react';
import { useDrafts } from '../../hooks/useDrafts';
import DraftsPanel from '../drafts/DraftsPanel';
import PostComposer from '../post-composer/PostComposer';

/**
 * Coordinates the composer and the drafts list.
 *
 * The split matters for performance: post content lives *inside* PostComposer,
 * so typing re-renders only that subtree and never touches DraftsPanel. Drafts
 * live here, above both, because two siblings need them. Lifting the post
 * content up here as well would make every keystroke re-render the whole draft
 * list — the state is placed as low as it can go and no lower.
 */
export default function ComposerWorkspace() {
  const {
    status,
    drafts,
    error,
    actionError,
    isSaving,
    pendingIds,
    saveDraft,
    removeDraft,
    reloadDrafts,
    dismissActionError,
  } = useDrafts();

  const [editingDraftId, setEditingDraftId] = useState(null);

  /**
   * The composer "session": which draft seeded the editor, and a key that is
   * bumped to remount it. Changing the key is how an opened draft replaces
   * whatever is in the editor — remounting resets the composer's internal state
   * cleanly, without an effect that syncs props into state (a pattern that is
   * easy to get subtly wrong).
   *
   * Both live in one state object because they must change together; a ref
   * would not work here, since values read during render have to be state for
   * React to re-render when they change.
   */
  const [session, setSession] = useState({ key: 0, draft: null });

  const handleSaveDraft = useCallback(
    async ({ content, platformId }) => {
      const saved = await saveDraft({ id: editingDraftId, content, platformId });

      // Binding to the newly created draft means a second save updates it
      // instead of creating a duplicate.
      if (saved && !editingDraftId) {
        setEditingDraftId(saved.id);
      }

      return saved;
    },
    [editingDraftId, saveDraft],
  );

  // Wrapped in useCallback so the memoised DraftListItem rows actually skip
  // re-rendering — a fresh function identity each render would defeat memo().
  const handleEditDraft = useCallback((draft) => {
    setEditingDraftId(draft.id);
    setSession((current) => ({ key: current.key + 1, draft }));
  }, []);

  const handleStopEditing = useCallback(() => {
    setEditingDraftId(null);
    setSession((current) => ({ key: current.key + 1, draft: null }));
  }, []);

  const handleDeleteDraft = useCallback(
    async (id) => {
      const deleted = await removeDraft(id);
      // Deleting the draft currently open would otherwise leave the composer
      // editing something that no longer exists.
      if (deleted && id === editingDraftId) {
        handleStopEditing();
      }
    },
    [editingDraftId, handleStopEditing, removeDraft],
  );

  // A published draft has served its purpose, so it is cleared from the list.
  const handlePublished = useCallback(() => {
    if (editingDraftId) {
      removeDraft(editingDraftId);
      setEditingDraftId(null);
    }
  }, [editingDraftId, removeDraft]);

  return (
    <div className="flex flex-col gap-5">
      <PostComposer
        key={session.key}
        initialDraft={session.draft}
        editingDraftId={editingDraftId}
        isSavingDraft={isSaving}
        onSaveDraft={handleSaveDraft}
        onStopEditing={handleStopEditing}
        onPublished={handlePublished}
      />

      <DraftsPanel
        status={status}
        drafts={drafts}
        error={error}
        actionError={actionError}
        pendingIds={pendingIds}
        activeDraftId={editingDraftId}
        onEditDraft={handleEditDraft}
        onDeleteDraft={handleDeleteDraft}
        onReload={reloadDrafts}
        onDismissActionError={dismissActionError}
      />
    </div>
  );
}
