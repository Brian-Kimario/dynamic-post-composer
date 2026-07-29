import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_PLATFORM_ID, getPlatform } from '../config/platforms';
import { validatePost } from '../utils/postValidation';

export const PUBLISH_STATUS = {
  IDLE: 'idle',
  PUBLISHING: 'publishing',
  SUCCESS: 'success',
};

/** Simulates network latency so the publishing state is actually observable. */
const PUBLISH_SIMULATION_MS = 900;
const SUCCESS_NOTICE_MS = 5000;

/**
 * Owns the composer's entire state machine so that PostComposer stays a layout
 * component. The extraction earns its place here because publishing is
 * genuinely stateful — it is asynchronous, it has to clear content on success,
 * and it owns timers that must be cleaned up. Bundling that with the two
 * simple `useState` calls keeps every state transition in one readable file
 * and gives future experiments a single seam to swap the simulated publish for
 * a real API call.
 */
export function usePostComposer() {
  const [platformId, setPlatformId] = useState(DEFAULT_PLATFORM_ID);
  const [content, setContent] = useState('');
  const [publishStatus, setPublishStatus] = useState(PUBLISH_STATUS.IDLE);
  const [lastPublishedPost, setLastPublishedPost] = useState(null);

  const publishTimerRef = useRef(null);
  const successTimerRef = useRef(null);

  const platform = getPlatform(platformId);

  /**
   * Derived, never stored. Character count, remaining characters and status all
   * come from `content` + `platform`, so there is no second copy of the truth
   * that could drift out of sync.
   *
   * The `useMemo` is not about typing — `content` changes on every keystroke, so
   * validation necessarily re-runs then. It avoids re-running the grapheme
   * segmentation when an *unrelated* piece of state changes (publish status
   * ticking through publishing → success → idle) while a long post sits in the
   * editor.
   */
  const validation = useMemo(() => validatePost(content, platform), [content, platform]);

  // Timers are cleared on unmount so a pending publish can never set state on an
  // unmounted component.
  useEffect(() => {
    return () => {
      clearTimeout(publishTimerRef.current);
      clearTimeout(successTimerRef.current);
    };
  }, []);

  const selectPlatform = useCallback((nextPlatformId) => {
    setPlatformId(nextPlatformId);
    // Content is intentionally preserved across platform switches: comparing the
    // same draft against different limits is the core interaction of this
    // experiment. Only the stale success notice is dismissed.
    setPublishStatus((current) =>
      current === PUBLISH_STATUS.SUCCESS ? PUBLISH_STATUS.IDLE : current,
    );
  }, []);

  const publish = useCallback(() => {
    if (!validation.isValid || publishStatus === PUBLISH_STATUS.PUBLISHING) {
      return;
    }

    setPublishStatus(PUBLISH_STATUS.PUBLISHING);

    publishTimerRef.current = setTimeout(() => {
      setLastPublishedPost({
        platformName: platform.name,
        characterCount: validation.characterCount,
        publishedAt: new Date(),
      });
      setContent('');
      setPublishStatus(PUBLISH_STATUS.SUCCESS);

      successTimerRef.current = setTimeout(
        () => setPublishStatus(PUBLISH_STATUS.IDLE),
        SUCCESS_NOTICE_MS,
      );
    }, PUBLISH_SIMULATION_MS);
  }, [platform.name, publishStatus, validation.characterCount, validation.isValid]);

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
    publishStatus,
    lastPublishedPost,
    publish,
    dismissSuccessNotice,
  };
}
