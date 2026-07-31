import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { draftsApi } from '../services/draftsApi';

export const REQUEST_STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
};

/**
 * Normalized storage: `{ ids: [], entities: {} }` rather than a flat array.
 *
 * Two concrete wins over the array this replaces. Updating one draft is a
 * key lookup instead of a `map` that rebuilds every element, and a row can
 * select *its own* entity by id — so editing one draft re-renders one row
 * rather than the whole list.
 *
 * The `sortComparer` keeps `ids` ordered newest-first permanently, which
 * removes the manual sort the list component used to do on every render.
 */
const draftsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
});

/**
 * Thunks own the async lifecycle. Each one dispatches pending/fulfilled/rejected
 * automatically, which is what lets the reducer below model loading and error
 * states without any manual flags being set from components.
 */
export const fetchDrafts = createAsyncThunk('drafts/fetchDrafts', async () => {
  return draftsApi.fetchAll();
});

/**
 * One entry point for create and update, so no component has to branch on
 * "does this draft exist yet?".
 */
export const saveDraft = createAsyncThunk(
  'drafts/saveDraft',
  async ({ id, content, platformId }) => {
    if (id) {
      return draftsApi.update(id, { content, platformId });
    }
    return draftsApi.create({ content, platformId });
  },
);

export const deleteDraft = createAsyncThunk('drafts/deleteDraft', async (id) => {
  return draftsApi.remove(id);
});

const draftsSlice = createSlice({
  name: 'drafts',
  initialState: draftsAdapter.getInitialState({
    status: REQUEST_STATUS.LOADING,
    /** Blocks the whole list — there is nothing to show. */
    error: null,
    /** A single failed mutation; the list is still usable. */
    actionError: null,
    isSaving: false,
    /** Ids with a delete in flight, for per-row spinners. */
    pendingIds: [],
  }),
  reducers: {
    actionErrorDismissed(state) {
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDrafts.pending, (state) => {
        state.status = REQUEST_STATUS.LOADING;
        state.error = null;
      })
      .addCase(fetchDrafts.fulfilled, (state, action) => {
        state.status = REQUEST_STATUS.READY;
        draftsAdapter.setAll(state, action.payload);
      })
      .addCase(fetchDrafts.rejected, (state, action) => {
        state.status = REQUEST_STATUS.ERROR;
        state.error = action.error.message;
      })

      .addCase(saveDraft.pending, (state) => {
        state.isSaving = true;
        state.actionError = null;
      })
      .addCase(saveDraft.fulfilled, (state, action) => {
        state.isSaving = false;
        // `upsertOne` inserts or merges, so create and update share one case.
        draftsAdapter.upsertOne(state, action.payload);
      })
      .addCase(saveDraft.rejected, (state, action) => {
        state.isSaving = false;
        state.actionError = action.error.message;
      })

      .addCase(deleteDraft.pending, (state, action) => {
        state.actionError = null;
        // `action.meta.arg` is the argument the thunk was dispatched with —
        // here the draft id, which is not yet in the payload at pending time.
        state.pendingIds.push(action.meta.arg);
      })
      .addCase(deleteDraft.fulfilled, (state, action) => {
        draftsAdapter.removeOne(state, action.payload);
        state.pendingIds = state.pendingIds.filter((id) => id !== action.payload);
      })
      .addCase(deleteDraft.rejected, (state, action) => {
        state.pendingIds = state.pendingIds.filter((id) => id !== action.meta.arg);
        state.actionError = action.error.message;
      });
  },
});

export const { actionErrorDismissed } = draftsSlice.actions;

export const {
  selectAll: selectAllDrafts,
  selectById: selectDraftById,
  selectTotal: selectDraftCount,
} = draftsAdapter.getSelectors((state) => state.drafts);

export const selectDraftsStatus = (state) => state.drafts.status;
export const selectDraftsError = (state) => state.drafts.error;
export const selectDraftsActionError = (state) => state.drafts.actionError;
export const selectIsSavingDraft = (state) => state.drafts.isSaving;
export const selectIsDraftPending = (state, id) => state.drafts.pendingIds.includes(id);

export default draftsSlice.reducer;
