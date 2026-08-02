import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { scheduleApi } from '../services/scheduleApi';
import { isSessionEnded } from './authSlice';
import { REQUEST_STATUS } from './draftsSlice';

/**
 * Scheduled posts, normalized like every other collection.
 *
 * Sorted by `scheduledFor` ascending rather than by `updatedAt` descending: this
 * is a plan, so the natural order is the order things happen. Dragging an event
 * changes its position in `ids` automatically, because the comparer runs on
 * every upsert — the calendar never sorts anything itself.
 *
 * The record is a draft's shape plus one field:
 *
 *   { id, content, platformId, scheduledFor, authorId, authorName, … }
 *
 * `scheduledFor` is a UTC ISO string. Storing an instant rather than a
 * wall-clock time is the decision that keeps the model honest: "9am" is
 * ambiguous across zones and across a daylight-saving boundary, an instant is
 * not. Everything the user sees is converted to local time in `utils/calendar.js`.
 */
const scheduleAdapter = createEntityAdapter({
  sortComparer: (a, b) => a.scheduledFor.localeCompare(b.scheduledFor),
});

export const fetchScheduledPosts = createAsyncThunk('schedule/fetchAll', async () => {
  return scheduleApi.fetchAll();
});

export const schedulePost = createAsyncThunk(
  'schedule/schedulePost',
  async ({ content, platformId, scheduledFor }) => {
    return scheduleApi.create({ content, platformId, scheduledFor });
  },
);

/**
 * One thunk behind both interactions: dropping an event on a new slot and
 * editing the date field in the detail panel. They differ only in how the new
 * instant is arrived at, so they should not differ in how it is saved.
 */
export const reschedulePost = createAsyncThunk(
  'schedule/reschedulePost',
  async ({ id, scheduledFor }) => {
    return scheduleApi.update(id, { scheduledFor });
  },
);

export const unschedulePost = createAsyncThunk('schedule/unschedulePost', async (id) => {
  return scheduleApi.remove(id);
});

const scheduleSlice = createSlice({
  name: 'schedule',
  initialState: scheduleAdapter.getInitialState({
    status: REQUEST_STATUS.LOADING,
    error: null,
    actionError: null,
    isSaving: false,
    /** Ids with a write in flight, so a dragged event can show it is settling. */
    pendingIds: [],
    /** Where an optimistically moved event came from, in case it has to go back. */
    rollback: null,
  }),
  reducers: {
    scheduleActionErrorDismissed(state) {
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchScheduledPosts.pending, (state) => {
        state.status = REQUEST_STATUS.LOADING;
        state.error = null;
      })
      .addCase(fetchScheduledPosts.fulfilled, (state, action) => {
        state.status = REQUEST_STATUS.READY;
        scheduleAdapter.setAll(state, action.payload);
      })
      .addCase(fetchScheduledPosts.rejected, (state, action) => {
        state.status = REQUEST_STATUS.ERROR;
        state.error = action.error.message;
      })

      .addCase(schedulePost.pending, (state) => {
        state.isSaving = true;
        state.actionError = null;
      })
      .addCase(schedulePost.fulfilled, (state, action) => {
        state.isSaving = false;
        scheduleAdapter.addOne(state, action.payload);
      })
      .addCase(schedulePost.rejected, (state, action) => {
        state.isSaving = false;
        state.actionError = action.error.message;
      })

      /**
       * Optimistic. The event moves to the dropped slot immediately and the
       * request settles behind it — a drag that visibly snapped back for a
       * third of a second on every drop would feel broken, and this is the one
       * interaction where latency is directly under the user's finger.
       *
       * `meta.arg` carries both the id and the new instant, so the optimistic
       * update needs nothing the pending action does not already have.
       */
      .addCase(reschedulePost.pending, (state, action) => {
        const { id, scheduledFor } = action.meta.arg;

        state.actionError = null;
        state.pendingIds.push(id);
        // Remember where it came from, so a rejection can put it back exactly.
        state.rollback = { id, scheduledFor: state.entities[id]?.scheduledFor };
        scheduleAdapter.updateOne(state, { id, changes: { scheduledFor } });
      })
      .addCase(reschedulePost.fulfilled, (state, action) => {
        state.pendingIds = state.pendingIds.filter((id) => id !== action.payload.id);
        state.rollback = null;
        // The server's record wins over the optimistic guess — it also carries
        // the new `updatedAt`.
        scheduleAdapter.upsertOne(state, action.payload);
      })
      .addCase(reschedulePost.rejected, (state, action) => {
        const { id } = action.meta.arg;

        state.pendingIds = state.pendingIds.filter((pendingId) => pendingId !== id);
        state.actionError = action.error.message;

        // Undo the optimistic move. Without this a viewer's refused drag would
        // leave the calendar showing a change that never happened.
        if (state.rollback?.id === id && state.rollback.scheduledFor) {
          scheduleAdapter.updateOne(state, {
            id,
            changes: { scheduledFor: state.rollback.scheduledFor },
          });
        }
        state.rollback = null;
      })

      .addCase(unschedulePost.pending, (state, action) => {
        state.actionError = null;
        state.pendingIds.push(action.meta.arg);
      })
      .addCase(unschedulePost.fulfilled, (state, action) => {
        scheduleAdapter.removeOne(state, action.payload);
        state.pendingIds = state.pendingIds.filter((id) => id !== action.payload);
      })
      .addCase(unschedulePost.rejected, (state, action) => {
        state.pendingIds = state.pendingIds.filter((id) => id !== action.meta.arg);
        state.actionError = action.error.message;
      })

      // Same reasoning as the drafts and posts slices: a session ending empties
      // the cache so the next user never sees the previous one's plan.
      .addMatcher(isSessionEnded, (state) => {
        scheduleAdapter.removeAll(state);
        state.status = REQUEST_STATUS.LOADING;
        state.error = null;
        state.actionError = null;
        state.pendingIds = [];
      });
  },
});

export const { scheduleActionErrorDismissed } = scheduleSlice.actions;

export const {
  selectAll: selectAllScheduledPosts,
  selectById: selectScheduledPostById,
  selectTotal: selectScheduledPostCount,
} = scheduleAdapter.getSelectors((state) => state.schedule);

export const selectScheduleStatus = (state) => state.schedule.status;
export const selectScheduleError = (state) => state.schedule.error;
export const selectScheduleActionError = (state) => state.schedule.actionError;
export const selectIsSchedulingPost = (state) => state.schedule.isSaving;
export const selectIsScheduledPostPending = (state, id) => state.schedule.pendingIds.includes(id);

export default scheduleSlice.reducer;
