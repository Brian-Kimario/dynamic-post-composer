import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { dragEnded } from '../store/calendarSlice';
import { reschedulePost } from '../store/scheduleSlice';
import { DRAG_TYPE } from '../components/calendar/ScheduledPostChip';
import { PERMISSION } from '../config/permissions';
import { usePermission } from './usePermission';

/**
 * Makes an element a drop target for scheduled posts.
 *
 * Month cells and time slots differ only in what instant a drop means — a day
 * keeping the original time, or a specific hour — so that difference is the
 * single argument and everything else lives here once.
 *
 * `resolveInstant(currentInstant) => Date` receives where the event is currently
 * scheduled, which is what lets a month-cell drop preserve the time of day.
 *
 * Two HTML5 drag-and-drop details that are easy to get wrong:
 *
 * 1. **`preventDefault()` in `dragover` is what marks an element droppable.**
 *    The default action of that event is "reject the drop", so an element
 *    without this handler silently refuses everything — the single most common
 *    reason a hand-rolled drop target appears to do nothing.
 * 2. **`dragleave` fires when the pointer crosses onto a child.** Highlighting
 *    naively flickers as the cursor moves over the chips inside a cell, so the
 *    handler ignores leaves whose destination is still inside this element.
 */
export function useScheduleDropTarget(resolveInstant) {
  const dispatch = useDispatch();
  const canSchedule = usePermission(PERMISSION.POST_SCHEDULE);

  const [isOver, setIsOver] = useState(false);

  const handleDragOver = useCallback(
    (event) => {
      if (!canSchedule || !event.dataTransfer.types.includes(DRAG_TYPE)) return;

      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setIsOver(true);
    },
    [canSchedule],
  );

  const handleDragLeave = useCallback((event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsOver(false);
  }, []);

  const handleDrop = useCallback(
    (event) => {
      const postId = event.dataTransfer.getData(DRAG_TYPE);

      setIsOver(false);
      dispatch(dragEnded());

      if (!canSchedule || !postId) return;

      event.preventDefault();

      // `getState` is deliberately not reached for here — the caller resolves the
      // instant from the event it already has, keeping this hook unaware of the
      // shape of a scheduled post.
      const scheduledFor = resolveInstant(postId);

      if (scheduledFor) {
        dispatch(reschedulePost({ id: postId, scheduledFor: scheduledFor.toISOString() }));
      }
    },
    [canSchedule, dispatch, resolveInstant],
  );

  return {
    isOver: isOver && canSchedule,
    dropProps: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
