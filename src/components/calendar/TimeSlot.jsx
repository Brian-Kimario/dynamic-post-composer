import { memo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectScheduledPostsForDay } from '../../store/selectors';
import { fromDateKey, withTimeOfDay } from '../../utils/calendar';
import { useScheduleDropTarget } from '../../hooks/useScheduleDropTarget';
import ScheduledPostChip from './ScheduledPostChip';

/**
 * One hour of one day — the actual "time slot" the brief asks posts to be
 * mapped onto.
 *
 * Selecting the day's posts and filtering to this hour, rather than grouping by
 * hour globally, is a deliberate trade: a week is 168 slots, and a
 * `Map` keyed by day-and-hour would be a second index to keep in step with the
 * first for no measurable gain at this size. The day grouping is memoized, so
 * this filter runs over a handful of events, not the whole collection.
 */
function TimeSlot({ dateKey, hour }) {
  const postsForDay = useSelector((state) => selectScheduledPostsForDay(state, dateKey));

  const posts = postsForDay.filter((post) => new Date(post.scheduledFor).getHours() === hour);

  // Dropping on an hour sets that hour exactly, discarding the original minutes
  // — the slot the user aimed at is the answer, not the slot plus a remembered
  // 47 minutes.
  const resolveInstant = useCallback(
    () => withTimeOfDay(fromDateKey(dateKey), { hours: hour }),
    [dateKey, hour],
  );

  const { isOver, dropProps } = useScheduleDropTarget(resolveInstant);

  return (
    <div
      {...dropProps}
      className={`flex min-h-12 flex-col gap-1 border-r border-b border-slate-200 p-1 transition ${
        isOver ? 'bg-slate-100 ring-2 ring-slate-900 ring-inset' : ''
      }`}
    >
      {posts.map((post) => (
        // The time is redundant inside an hour row, so the chip drops it and
        // gives the width back to the content.
        <ScheduledPostChip key={post.id} postId={post.id} showTime={false} />
      ))}
    </div>
  );
}

export default memo(TimeSlot);
