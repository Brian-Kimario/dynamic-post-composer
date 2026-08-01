import { createSlice } from '@reduxjs/toolkit';
import { isSessionEnded } from './authSlice';
import { addDays, addMonths, fromDateKey, toDateKey } from '../utils/calendar';

export const CALENDAR_VIEW = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
};

/**
 * View state for the calendar, kept separate from the scheduled posts themselves
 * — the same split as `filters` and `drafts`. `schedule` answers "what is
 * planned"; this answers "what is the user looking at".
 *
 * `focusedDateKey` is a `YYYY-MM-DD` string rather than a `Date`. Redux state
 * must be serializable, and a `Date` in the store trips the serializability
 * check, breaks time-travel debugging, and compares by reference so every
 * selector reading it would recompute on any dispatch. The string is stable,
 * inspectable in DevTools, and one `fromDateKey` away from arithmetic.
 *
 * Which day is "focused" means something slightly different per view — the month
 * containing it, the week containing it, or the day itself — so one field drives
 * all three and switching views keeps the user near where they were.
 */
const calendarSlice = createSlice({
  name: 'calendar',
  initialState: {
    view: CALENDAR_VIEW.MONTH,
    focusedDateKey: toDateKey(new Date()),
    /** The event whose detail panel is open, if any. */
    selectedEventId: null,
    /** The event currently being dragged, for drop-target highlighting. */
    draggingEventId: null,
  },
  reducers: {
    viewChanged(state, action) {
      state.view = action.payload;
    },

    dateFocused(state, action) {
      state.focusedDateKey = action.payload;
    },

    todayFocused(state) {
      state.focusedDateKey = toDateKey(new Date());
    },

    /**
     * Paging is view-aware: a month at a time in month view, a week in week
     * view, a day in day view. Putting that rule in the reducer keeps the
     * toolbar from having to know it, and keeps the three buttons identical.
     */
    periodStepped(state, action) {
      const step = action.payload;
      const focused = fromDateKey(state.focusedDateKey);

      const next =
        state.view === CALENDAR_VIEW.MONTH
          ? addMonths(focused, step)
          : addDays(focused, step * (state.view === CALENDAR_VIEW.WEEK ? 7 : 1));

      state.focusedDateKey = toDateKey(next);
    },

    eventSelected(state, action) {
      state.selectedEventId = action.payload;
    },

    eventDeselected(state) {
      state.selectedEventId = null;
    },

    dragStarted(state, action) {
      state.draggingEventId = action.payload;
    },

    /**
     * Cleared on drop *and* on drag-end, because a drag abandoned outside any
     * target fires only the latter — without it the calendar would stay lit up
     * as though something were still in flight.
     */
    dragEnded(state) {
      state.draggingEventId = null;
    },
  },
  extraReducers: (builder) => {
    /**
     * Which month you are looking at is a harmless preference and survives, the
     * same way the drafts filters do. An *open dialog* does not: without this,
     * signing out with an event selected greets the next user with a modal about
     * a post they did not click on.
     */
    builder.addMatcher(isSessionEnded, (state) => {
      state.selectedEventId = null;
      state.draggingEventId = null;
    });
  },
});

export const {
  viewChanged,
  dateFocused,
  todayFocused,
  periodStepped,
  eventSelected,
  eventDeselected,
  dragStarted,
  dragEnded,
} = calendarSlice.actions;

export const selectCalendarView = (state) => state.calendar.view;
export const selectFocusedDateKey = (state) => state.calendar.focusedDateKey;
export const selectSelectedEventId = (state) => state.calendar.selectedEventId;
export const selectDraggingEventId = (state) => state.calendar.draggingEventId;

export default calendarSlice.reducer;
