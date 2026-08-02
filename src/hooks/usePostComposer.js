import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { platformSelected, selectSelectedPlatform } from '../store/platformsSlice';
import {
  composerReset,
  composerUnbound,
  draftBound,
  selectEditingDraftId,
} from '../store/composerSlice';
import { deleteDraft, saveDraft, selectDraftById, selectIsSavingDraft } from '../store/draftsSlice';
import { publishPost } from '../store/postsSlice';
import { validatePost } from '../utils/postValidation';

export const PUBLISH_STATUS = {
  IDLE: 'idle',
  PUBLISHING: 'publishing',
  SUCCESS: 'success',
};

const SUCCESS_NOTICE_MS = 5000;

/**
 * The composer's logic, now sitting on top of the store.
 *
 * Platform selection, drafts and published posts moved into Redux, so this hook
 * reads them with `useSelector` and changes them with `dispatch`. What stayed
 * local is `content`: it changes on every keystroke and only this subtree needs
 * it, so keeping it in `useState` avoids dispatching an action per character.
 * That is the "separation of UI state and data state" idea applied honestly —
 * global state is for shared data, not for everything.
 */
export function usePostComposer() {
  const dispatch = useDispatch();

  const platform = useSelector(selectSelectedPlatform);
  const editingDraftId = useSelector(selectEditingDraftId);
  const isSavingDraft = useSelector(selectIsSavingDraft);

  // Seeds the editor when an existing draft is opened. Read once as initial
  // state only — ComposerWorkspace remounts this component via `key` when a
  // different draft is opened.
  const editingDraft = useSelector((state) =>
    editingDraftId ? selectDraftById(state, editingDraftId) : null,
  );

  const [content, setContent] = useState(editingDraft?.content ?? '');
  const [publishStatus, setPublishStatus] = useState(PUBLISH_STATUS.IDLE);
  const [lastPublishedPost, setLastPublishedPost] = useState(null);

  const successTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(successTimerRef.current);
  }, []);

  /**
   * Derived, never stored. The `useMemo` does not speed up typing — `content`
   * changes every keystroke, so validation necessarily re-runs. It avoids
   * re-running grapheme segmentation when unrelated state changes while a long
   * post sits in the editor.
   */
  const validation = useMemo(() => validatePost(content, platform), [content, platform]);

  const selectPlatform = useCallback(
    (platformId) => {
      dispatch(platformSelected(platformId));
      if (publishStatus === PUBLISH_STATUS.SUCCESS) {
        setPublishStatus(PUBLISH_STATUS.IDLE);
      }
    },
    [dispatch, publishStatus],
  );

  /**
   * `.unwrap()` re-throws the thunk's rejection so this reads like ordinary
   * async code; without it the dispatch always resolves and the failure would
   * have to be inspected on the returned action.
   */
  const saveCurrentDraft = useCallback(async () => {
    try {
      const saved = await dispatch(
        saveDraft({ id: editingDraftId, content, platformId: platform.id }),
      ).unwrap();

      if (!editingDraftId) {
        dispatch(draftBound(saved.id));
      }
      return saved;
    } catch {
      // The slice already recorded the message; the panel renders it.
      return null;
    }
  }, [content, dispatch, editingDraftId, platform.id]);

  const publish = useCallback(async () => {
    if (!validation.isValid || publishStatus === PUBLISH_STATUS.PUBLISHING) return;

    setPublishStatus(PUBLISH_STATUS.PUBLISHING);

    try {
      await dispatch(publishPost({ content, platformId: platform.id })).unwrap();

      setLastPublishedPost({
        platformName: platform.name,
        characterCount: validation.characterCount,
      });

      // A published draft has served its purpose. Unbind rather than reset:
      // `composerReset` bumps the session id, which would remount this component
      // and discard the success notice before it ever rendered.
      if (editingDraftId) {
        dispatch(deleteDraft(editingDraftId));
        dispatch(composerUnbound());
      }
      setContent('');

      setPublishStatus(PUBLISH_STATUS.SUCCESS);
      successTimerRef.current = setTimeout(
        () => setPublishStatus(PUBLISH_STATUS.IDLE),
        SUCCESS_NOTICE_MS,
      );
    } catch {
      setPublishStatus(PUBLISH_STATUS.IDLE);
    }
  }, [
    content,
    dispatch,
    editingDraftId,
    platform.id,
    platform.name,
    publishStatus,
    validation.characterCount,
    validation.isValid,
  ]);

  /**
   * Scheduling ends the composing session the same way publishing does: the post
   * has a destination now, so the working copy has served its purpose. Shared
   * with `publish` rather than reimplemented, so the two cannot drift apart.
   *
   * Unbind rather than reset — `composerReset` bumps the session id, which would
   * remount this component and discard the confirmation the user just earned.
   */
  const clearAfterScheduling = useCallback(() => {
    if (editingDraftId) {
      dispatch(deleteDraft(editingDraftId));
      dispatch(composerUnbound());
    }
    setContent('');
  }, [dispatch, editingDraftId]);

  const stopEditing = useCallback(() => dispatch(composerReset()), [dispatch]);

  const dismissSuccessNotice = useCallback(() => {
    clearTimeout(successTimerRef.current);
    setPublishStatus(PUBLISH_STATUS.IDLE);
  }, []);

  return {
    platform,
    content,
    setContent,
    selectPlatform,
    validation,
    editingDraftId,
    isSavingDraft,
    saveCurrentDraft,
    clearAfterScheduling,
    stopEditing,
    publishStatus,
    lastPublishedPost,
    publish,
    dismissSuccessNotice,
  };
}
