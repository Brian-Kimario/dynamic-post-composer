import { memo, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { makeSelectScheduledPostsForSlot } from '../../store/selectors';
import { fromDateKey, withTimeOfDay } from '../../utils/calendar';
import { useScheduleDropTarget } from '../../hooks/useScheduleDropTarget';
import ScheduledPostChip from './ScheduledPostChip';

/**
 * One hour of one day — the actual "time slot" the brief asks posts to be
 * mapped onto.
 *
 * The hour filter used to run here, in the component body. That was correct and
 * it meant all 168 slots of a week re-rendered whenever any post moved, because
 * the day's array identity changed underneath them. It now happens inside a
 * per-slot memoized selector, so a slot re-renders only when *its own hour*
 * gains or loses an event.
 */
function TimeSlot({ dateKey, hour }) {
  const selectPosts = useMemo(() => makeSelectScheduledPostsForSlot(), []);
  const posts = useSelector((state) => selectPosts(state, dateKey, hour));

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
