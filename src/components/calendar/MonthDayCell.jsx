import { memo, useCallback } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { selectScheduledPostIdsForDay } from '../../store/selectors';
import { selectScheduledPostById } from '../../store/scheduleSlice';
import { CALENDAR_VIEW, dateFocused, viewChanged } from '../../store/calendarSlice';
import {
  formatDayNumber,
  formatFullDate,
  fromDateKey,
  isToday,
  moveToDay,
} from '../../utils/calendar';
import { useScheduleDropTarget } from '../../hooks/useScheduleDropTarget';
import ScheduledPostChip from './ScheduledPostChip';

/** Chips rendered before the cell collapses the rest into a summary. */
const MAX_VISIBLE = 3;

/**
 * One day in the month grid: a drop target that renders its own events.
 *
 * Takes a `dateKey` string rather than a `Date` so the props stay primitive and
 * `memo` can do its job — a `new Date()` prop would be a new reference on every
 * parent render and defeat the comparison entirely.
 */
function MonthDayCell({ dateKey, isCurrentMonth }) {
  const dispatch = useDispatch();
  // The drop handler needs the dragged post's current time, which is state read
  // in an event rather than during render — exactly what `useStore` is for.
  // Subscribing to it with `useSelector` would re-render every cell on any change.
  const store = useStore();

  const postIds = useSelector((state) => selectScheduledPostIdsForDay(state, dateKey));

  const day = fromDateKey(dateKey);
  const today = isToday(day);

  /**
   * Dropping on a day changes the date and keeps the time of day. Someone
   * dragging a 9am post from Tuesday to Thursday means "same slot, different
   * day" — resetting it to midnight would be technically defensible and
   * infuriating.
   */
  const resolveInstant = useCallback(
    (postId) => {
      const post = selectScheduledPostById(store.getState(), postId);
      if (!post) return null;

      return moveToDay(new Date(post.scheduledFor), fromDateKey(dateKey));
    },
    [dateKey, store],
  );

  const { isOver, dropProps } = useScheduleDropTarget(resolveInstant);

  const openDay = () => {
    dispatch(dateFocused(dateKey));
    dispatch(viewChanged(CALENDAR_VIEW.DAY));
  };

  return (
    <div
      {...dropProps}
      className={`flex min-h-24 flex-col gap-1 border-r border-b border-slate-200 p-1.5 transition ${
        isCurrentMonth ? 'bg-white' : 'bg-slate-50/70'
      } ${isOver ? 'ring-2 ring-slate-900 ring-inset' : ''}`}
    >
      <div className="flex items-center justify-between">
        {/* The date number opens the day view — the standard calendar
            affordance, and the keyboard route into a single day. */}
        <button
          type="button"
          onClick={openDay}
          aria-label={`Open ${formatFullDate(day)}`}
          className={`rounded-md px-1.5 py-0.5 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none ${
            today
              ? 'bg-slate-900 text-white'
              : isCurrentMonth
                ? 'text-slate-700 hover:bg-slate-100'
                : 'text-slate-400 hover:bg-slate-100'
          }`}
        >
          {formatDayNumber(day)}
        </button>

        {postIds.length > 0 && (
          <span className="text-[0.625rem] text-slate-400 tabular-nums">{postIds.length}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {postIds.slice(0, MAX_VISIBLE).map((postId) => (
          <ScheduledPostChip key={postId} postId={postId} />
        ))}

        {postIds.length > MAX_VISIBLE && (
          <button
            type="button"
            onClick={openDay}
            className="rounded-md px-1.5 py-0.5 text-left text-[0.625rem] font-medium text-slate-500 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
          >
            +{postIds.length - MAX_VISIBLE} more
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(MonthDayCell);
