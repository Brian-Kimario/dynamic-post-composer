import { useCallback, useEffect, useReducer, useRef } from 'react';
import * as draftsApi from '../services/draftsApi';

export const DRAFTS_STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
};

const initialState = {
  status: DRAFTS_STATUS.LOADING,
  drafts: [],
  /** Error from the initial load — blocks the whole list. */
  error: null,
  /** Error from a single create/update/delete — the list is still usable. */
  actionError: null,
  isSaving: false,
  /** Ids of drafts with an update or delete in flight, for per-row spinners. */
  pendingIds: [],
};

/**
 * `useReducer` rather than several `useState` calls. Drafts have one piece of
 * data mutated by four async operations, each with its own start/success/error
 * transition. Expressing that as a reducer keeps every legal transition in one
 * place — with separate `useState`s it is easy to set `isSaving` without
 * clearing `actionError`, and end up in a state that should not exist.
 */
function draftsReducer(state, action) {
  switch (action.type) {
    case 'load/start':
      return { ...state, status: DRAFTS_STATUS.LOADING, error: null };

    case 'load/success':
      return { ...state, status: DRAFTS_STATUS.READY, drafts: action.drafts, error: null };

    case 'load/error':
      return { ...state, status: DRAFTS_STATUS.ERROR, error: action.error };

    case 'save/start':
      return { ...state, isSaving: true, actionError: null };

    case 'save/created':
      return { ...state, isSaving: false, drafts: [action.draft, ...state.drafts] };

    case 'save/updated':
      return {
        ...state,
        isSaving: false,
        drafts: state.drafts.map((draft) => (draft.id === action.draft.id ? action.draft : draft)),
      };

    case 'save/error':
      return { ...state, isSaving: false, actionError: action.error };

    case 'mutate/start':
      return { ...state, actionError: null, pendingIds: [...state.pendingIds, action.id] };

    case 'mutate/end':
      return { ...state, pendingIds: state.pendingIds.filter((id) => id !== action.id) };

    case 'delete/success':
      return {
        ...state,
        drafts: state.drafts.filter((draft) => draft.id !== action.id),
        pendingIds: state.pendingIds.filter((id) => id !== action.id),
      };

    case 'error/dismiss':
      return { ...state, actionError: null };

    default:
      return state;
  }
}

export function useDrafts() {
  const [state, dispatch] = useReducer(draftsReducer, initialState);

  /**
   * Guards every async completion. Without it, a request that resolves after
   * the component unmounts would dispatch into a dead reducer — the classic
   * memory-leak warning. The ref is flipped in the effect cleanup.
   */
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadDrafts = useCallback(async () => {
    dispatch({ type: 'load/start' });
    try {
      const drafts = await draftsApi.fetchDrafts();
      if (!isMountedRef.current) return;
      dispatch({ type: 'load/success', drafts });
    } catch (error) {
      if (!isMountedRef.current) return;
      dispatch({ type: 'load/error', error: error.message });
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  /**
   * Creates or updates depending on whether an id is supplied, so callers have
   * a single "save" entry point and do not duplicate that branch in the UI.
   * Returns the saved draft (or null on failure) so the caller can bind the
   * composer to a newly created draft.
   */
  const saveDraft = useCallback(async ({ id, content, platformId }) => {
    dispatch({ type: 'save/start' });

    try {
      if (id) {
        const draft = await draftsApi.updateDraft(id, { content, platformId });
        if (!isMountedRef.current) return null;
        dispatch({ type: 'save/updated', draft });
        return draft;
      }

      const draft = await draftsApi.createDraft({ content, platformId });
      if (!isMountedRef.current) return null;
      dispatch({ type: 'save/created', draft });
      return draft;
    } catch (error) {
      if (!isMountedRef.current) return null;
      dispatch({ type: 'save/error', error: error.message });
      return null;
    }
  }, []);

  const removeDraft = useCallback(async (id) => {
    dispatch({ type: 'mutate/start', id });

    try {
      await draftsApi.deleteDraft(id);
      if (!isMountedRef.current) return false;
      dispatch({ type: 'delete/success', id });
      return true;
    } catch (error) {
      if (!isMountedRef.current) return false;
      dispatch({ type: 'mutate/end', id });
      dispatch({ type: 'save/error', error: error.message });
      return false;
    }
  }, []);

  const dismissActionError = useCallback(() => dispatch({ type: 'error/dismiss' }), []);

  return {
    ...state,
    saveDraft,
    removeDraft,
    reloadDrafts: loadDrafts,
    dismissActionError,
  };
}
